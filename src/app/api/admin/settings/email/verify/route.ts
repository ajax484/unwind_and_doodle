import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  verifyEmailTransport,
  getTransporter,
  getTransportMode,
} from '@/lib/email-transporter';
import {
  resolveEffectiveReplyTo,
  getOrganizationEmailSettings,
  recordEmailDeliveryLog,
  isValidEmailAddress,
} from '@/services/email-settings.service';
import { getConfig } from '@/lib/config';
import { baseHtmlWrapper } from '@/services/service-email.service';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const orgId = adminContext.organization.id;

    let body: { action?: 'verify' | 'send_test'; to?: string; replyTo?: string } = {};
    try {
      body = await req.json();
    } catch {
      body = { action: 'verify' };
    }

    const action = body.action || 'verify';

    if (action === 'verify') {
      const verification = await verifyEmailTransport();
      return NextResponse.json(
        {
          success: verification.ok,
          data: verification,
          error: verification.error,
        },
        { status: 200 }
      );
    }

    // Live test email send with Reply-To header verification
    const toEmail = (body.to || '').trim();
    if (!isValidEmailAddress(toEmail)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid recipient email address.' },
        { status: 400 }
      );
    }

    const { smtp } = getConfig();
    const orgSettings = await getOrganizationEmailSettings(supabase, orgId);
    const replyTo = await resolveEffectiveReplyTo(supabase, orgId, body.replyTo);
    const fromName = orgSettings.defaultSenderName || 'Unwind & Doodle';
    const fromEmail = orgSettings.defaultSenderEmail
      ? `"${fromName}" <${orgSettings.defaultSenderEmail}>`
      : smtp.from || 'Unwind and Doodle <no-reply@unwindanddoodle.com>';

    const subject = 'Email Delivery & Reply-To Test — Unwind & Doodle';
    const html = baseHtmlWrapper(
      subject,
      `
      <h2>Email Delivery Test Succeeded</h2>
      <p>This test email confirms your Unwind &amp; Doodle email configuration is working.</p>
      <div class="highlight-box">
        <p style="margin: 0;"><strong>From:</strong> ${fromEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        <p style="margin: 4px 0 0;"><strong>Reply-To:</strong> ${replyTo || 'Not configured'}</p>
        <p style="margin: 4px 0 0;"><strong>Sent At:</strong> ${new Date().toISOString()}</p>
      </div>
      <p>Try hitting <strong>Reply</strong> in your email client — your reply should automatically be addressed to <strong>${replyTo || fromEmail.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>.</p>
      `.trim()
    );

    const transportMode = getTransportMode();
    const transporter = getTransporter();

    try {
      const info = await transporter.sendMail({
        from: fromEmail,
        to: toEmail,
        replyTo,
        subject,
        html,
        text: `Email Delivery Test Succeeded.\nFrom: ${fromEmail}\nReply-To: ${replyTo || 'Not configured'}\nTry replying to this email to verify replies reach your monitored inbox.`,
      });

      const messageId =
        info.messageId || `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      await recordEmailDeliveryLog(supabase, {
        organizationId: orgId,
        channel: 'test',
        templateKey: 'delivery_health_test',
        toEmail,
        fromEmail,
        replyToEmail: replyTo || null,
        subject,
        status: transportMode === 'json_fallback' ? 'simulated' : 'sent',
        providerMessageId: messageId,
        transportMode,
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            messageId,
            transportMode,
            from: fromEmail,
            replyTo: replyTo || null,
            simulated: transportMode === 'json_fallback',
          },
          message:
            transportMode === 'json_fallback'
              ? 'Email was simulated (SMTP credentials are not configured in this environment).'
              : `Test email sent to ${toEmail}.`,
        },
        { status: 200 }
      );
    } catch (sendErr: unknown) {
      const errorMsg = sendErr instanceof Error ? sendErr.message : 'Failed to send test email';

      await recordEmailDeliveryLog(supabase, {
        organizationId: orgId,
        channel: 'test',
        templateKey: 'delivery_health_test',
        toEmail,
        fromEmail,
        replyToEmail: replyTo || null,
        subject,
        status: 'failed',
        transportMode,
        errorMessage: errorMsg,
      });

      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error verifying email delivery';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : 500 }
    );
  }
}
