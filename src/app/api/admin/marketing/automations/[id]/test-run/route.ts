import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { normalizeAutomationSteps } from '@/services/marketing-automation.service';
import { resolveMarketingContext } from '@/services/marketing-context.service';
import { renderMarketingTemplate } from '@/services/marketing-renderer.service';
import { resolveEffectiveReplyTo } from '@/services/email-settings.service';
import { getMarketingEmailProvider } from '@/services/marketing-provider/nodemailer-marketing.provider';
import { MarketingAutomationConfig } from '@/types/marketing';

const TestRunSchema = z.object({
  recipientEmail: z.string().email('Please provide a valid test recipient email address'),
  firstName: z.string().trim().max(100).optional(),
});

/**
 * POST /api/admin/marketing/automations/[id]/test-run
 * Admin test-run mode (EML-AUTO-6):
 * Dispatches a [TEST] run of the automation's email step(s) to a single specified recipient
 * BEFORE enabling the automation, without mutating live customer consent or enrollment state.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { id: automationId } = await params;

    const body = await req.json();
    const parsed = TestRunSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid test-run payload' },
        { status: 400 }
      );
    }

    const { recipientEmail, firstName } = parsed.data;
    const normalizedEmail = recipientEmail.trim().toLowerCase();
    const supabase = getServiceSupabaseClient();

    // 1. Fetch automation (allowed in draft, paused, or active status for pre-enable testing)
    const { data: automation, error: autoErr } = await supabase
      .from('marketing_automations')
      .select('*')
      .eq('id', automationId)
      .eq('organization_id', adminContext.organization.id)
      .maybeSingle();

    if (autoErr || !automation) {
      return NextResponse.json(
        { success: false, error: 'Automation not found' },
        { status: 404 }
      );
    }

    const config = (automation.config || {}) as unknown as MarketingAutomationConfig;
    const steps = normalizeAutomationSteps(config);
    const sendSteps = steps.filter((s): s is Extract<typeof s, { type: 'send_email' }> => s.type === 'send_email');

    if (sendSteps.length === 0) {
      return NextResponse.json(
        { success: false, error: 'This automation has no email steps configured to test.' },
        { status: 400 }
      );
    }

    const provider = getMarketingEmailProvider();
    const nowIso = new Date().toISOString();
    const stepResults: Array<{
      stepId: string;
      campaignId: string;
      subject: string;
      success: boolean;
      providerMessageId?: string | null;
      error?: string;
    }> = [];

    for (const sendStep of sendSteps) {
      const { data: campaign } = await (supabase as any)
        .from('marketing_campaigns')
        .select('id, organization_id, name, subject, sender_name, sender_email, reply_to_email, content')
        .eq('id', sendStep.campaignId)
        .eq('organization_id', adminContext.organization.id)
        .maybeSingle();

      if (!campaign || !campaign.subject?.trim() || !campaign.sender_email?.trim()) {
        stepResults.push({
          stepId: sendStep.id,
          campaignId: sendStep.campaignId,
          subject: campaign?.subject || '(missing campaign)',
          success: false,
          error: 'Referenced campaign is missing or incomplete',
        });
        continue;
      }

      const marketingContext = await resolveMarketingContext(supabase, {
        organizationId: adminContext.organization.id,
        customerEmail: normalizedEmail,
        campaignId: campaign.id,
        automationType: automation.type,
        domainEventPayload: {
          firstName: firstName || 'Test',
          email: normalizedEmail,
          orderNumber: 'TEST-ORD-0001',
        },
      });

      const content = campaign.content as { blocks?: unknown[]; html?: string; text?: string } | null;
      const hasBlocks = Array.isArray(content?.blocks) && content.blocks.length > 0;
      const templateInput: string | { blocks?: any[]; html?: string } = hasBlocks
        ? { blocks: content!.blocks as any[] }
        : content?.html || '';

      const renderedSubject = `[TEST] ${renderMarketingTemplate(campaign.subject, marketingContext, { isHtml: false })}`;
      const renderedHtml = renderMarketingTemplate(templateInput, marketingContext, { isHtml: true });
      const renderedText = content?.text
        ? renderMarketingTemplate(content.text, marketingContext, { isHtml: false })
        : undefined;

      const effectiveReplyTo = await resolveEffectiveReplyTo(
        supabase,
        adminContext.organization.id,
        campaign.reply_to_email
      );

      const sendRes = await provider.sendEmail({
        to: normalizedEmail,
        subject: renderedSubject,
        senderName: campaign.sender_name || 'Unwind & Doodle',
        senderEmail: campaign.sender_email,
        replyTo: effectiveReplyTo,
        html: renderedHtml,
        text: renderedText,
        headers: {
          'X-Automation-Id': automation.id,
          'X-Automation-Test-Run': 'true',
          'X-Campaign-Id': campaign.id,
        },
      });

      stepResults.push({
        stepId: sendStep.id,
        campaignId: campaign.id,
        subject: renderedSubject,
        success: Boolean(sendRes.success),
        providerMessageId: sendRes.providerMessageId || null,
        error: sendRes.error,
      });
    }

    const allSucceeded = stepResults.every((r) => r.success);

    // Record test execution in history with is_test_run = true (non-blocking if schema not yet migrated)
    try {
      await (supabase as any).from('marketing_automation_executions').insert({
        organization_id: adminContext.organization.id,
        automation_id: automation.id,
        domain_event_id: null,
        trigger_event_type: 'admin.test_run',
        is_test_run: true,
        campaign_id: sendSteps[0].campaignId,
        customer_id: null,
        customer_email: normalizedEmail,
        status: allSucceeded ? 'completed' : 'failed',
        engine: 'legacy',
        config_snapshot: automation.config,
        step_states: stepResults.map((r) => ({
          step_id: r.stepId,
          type: 'send_email',
          status: r.success ? 'completed' : 'failed',
          executed_at: nowIso,
          provider_message_id: r.providerMessageId || null,
          error_message: r.error || null,
        })),
        scheduled_for: nowIso,
        executed_at: nowIso,
        error_message: allSucceeded ? null : stepResults.find((r) => !r.success)?.error || 'Test run failed',
        created_at: nowIso,
        updated_at: nowIso,
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json(
      {
        success: allSucceeded,
        data: {
          automationId: automation.id,
          recipientEmail: normalizedEmail,
          stepsExecuted: stepResults.length,
          results: stepResults,
        },
        ...(allSucceeded ? {} : { error: 'One or more test email steps failed to send.' }),
      },
      { status: allSucceeded ? 200 : 500 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test run failed';
    const isAuth = message.includes('Authentication') || message.includes('Forbidden') || message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
