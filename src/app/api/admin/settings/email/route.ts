import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getOrganizationEmailSettings,
  updateOrganizationEmailSettings,
  listEmailDeliveryLogs,
  getEmailDeliverySummary,
  EmailDeliveryChannel,
  EmailDeliveryStatus,
} from '@/services/email-settings.service';
import { getTransporterInfo } from '@/lib/email-transporter';
import { getConfig } from '@/lib/config';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const orgId = adminContext.organization.id;

    const { searchParams } = new URL(req.url);
    const channel = (searchParams.get('channel') as EmailDeliveryChannel) || undefined;
    const status = (searchParams.get('status') as EmailDeliveryStatus) || undefined;
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    const [settings, logs, summary] = await Promise.all([
      getOrganizationEmailSettings(supabase, orgId),
      listEmailDeliveryLogs(supabase, orgId, { limit, channel, status }),
      getEmailDeliverySummary(supabase, orgId),
    ]);

    const transport = getTransporterInfo();
    const { appUrl, marketingWebhookSecret } = getConfig();

    return NextResponse.json(
      {
        success: true,
        data: {
          settings,
          transport,
          webhookUrl: `${appUrl.replace(/\/+$/, '')}/api/webhooks/email`,
          webhookSecretConfigured: Boolean(marketingWebhookSecret),
          summary,
          logs,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error loading email settings';
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

export async function PATCH(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();

    const updated = await updateOrganizationEmailSettings(
      supabase,
      adminContext.organization.id,
      {
        replyToEmail: body.replyToEmail ?? body.reply_to_email ?? null,
        defaultSenderName: body.defaultSenderName ?? body.default_sender_name ?? null,
        defaultSenderEmail: body.defaultSenderEmail ?? body.default_sender_email ?? null,
      },
      adminContext.user.id
    );

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: 'Email settings updated successfully',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating email settings';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : 400 }
    );
  }
}
