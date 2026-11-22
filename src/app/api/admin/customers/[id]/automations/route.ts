import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export interface CustomerAutomationHistoryItem {
  id: string;
  automationId: string;
  automationName: string;
  automationType: string;
  status: string;
  currentStepId: string | null;
  triggerEventType: string | null;
  skipReason: string | null;
  errorMessage: string | null;
  scheduledFor: string;
  executedAt: string | null;
  createdAt: string;
  isTestRun: boolean;
  stepStates: Array<{
    step_id: string;
    type: string;
    status: string;
    executed_at?: string | null;
    skip_reason?: string | null;
    error_message?: string | null;
  }>;
}

/**
 * GET /api/admin/customers/[id]/automations
 * Returns per-customer email automation history (EML-AUTO-6):
 * automations entered, current step, emails sent/skipped/failed, and trigger reason.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { id: customerId } = await params;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // 1. Fetch customer to confirm org ownership and get email
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, email, organization_id')
      .eq('id', customerId)
      .eq('organization_id', adminContext.organization.id)
      .maybeSingle();

    if (custErr || !customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    const normalizedEmail = customer.email?.trim().toLowerCase() || '';

    // 2. Fetch automation executions matching customer_id or customer_email
    let execQuery = (supabase as any)
      .from('marketing_automation_executions')
      .select('*')
      .eq('organization_id', adminContext.organization.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (normalizedEmail) {
      execQuery = execQuery.or(`customer_id.eq.${customer.id},customer_email.ilike.${normalizedEmail}`);
    } else {
      execQuery = execQuery.eq('customer_id', customer.id);
    }

    const { data: executions, error: execErr } = await execQuery;
    if (execErr) {
      throw new Error(`Failed to fetch automation history: ${execErr.message}`);
    }

    const rows = Array.isArray(executions) ? executions : [];
    const autoIds = Array.from(new Set(rows.map((r: any) => r.automation_id).filter(Boolean)));

    const autoMap = new Map<string, { name: string; type: string; triggerType: string | null }>();
    if (autoIds.length > 0) {
      const { data: automations } = await supabase
        .from('marketing_automations')
        .select('id, name, type, config')
        .in('id', autoIds);

      for (const a of automations || []) {
        const cfg = a.config as { trigger?: { type?: string } } | null;
        autoMap.set(a.id, {
          name: a.name,
          type: a.type,
          triggerType: cfg?.trigger?.type || null,
        });
      }
    }

    const history: CustomerAutomationHistoryItem[] = rows.map((row: any) => {
      const meta = autoMap.get(row.automation_id);
      return {
        id: row.id,
        automationId: row.automation_id,
        automationName: meta?.name || 'Automation',
        automationType: meta?.type || 'unknown',
        status: row.status,
        currentStepId: row.current_step_id || null,
        triggerEventType: row.trigger_event_type || meta?.triggerType || null,
        skipReason: row.skip_reason || null,
        errorMessage: row.error_message || null,
        scheduledFor: row.scheduled_for,
        executedAt: row.executed_at || null,
        createdAt: row.created_at,
        isTestRun: Boolean(row.is_test_run),
        stepStates: Array.isArray(row.step_states) ? row.step_states : [],
      };
    });

    return NextResponse.json({ success: true, data: history }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch customer automation history';
    const isAuth = message.includes('Authentication') || message.includes('Forbidden') || message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
