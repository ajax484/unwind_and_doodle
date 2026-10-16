import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  SERVICE_EMAIL_REGISTRY,
  getServiceEmailTemplateDetail,
  renderServiceEmail,
} from '@/services/service-email.service';
import { dispatchTransactionalEmail } from '@/services/notification.service';
import { EmailNotificationTemplate } from '@/types/notification';

function isValidTemplateKey(key: string): key is EmailNotificationTemplate {
  return key in SERVICE_EMAIL_REGISTRY;
}

// In-memory test email rate limiting: max 5 test emails per admin per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 5) {
    return false;
  }
  entry.count++;
  return true;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const { key } = await params;
    if (!isValidTemplateKey(key)) {
      return NextResponse.json(
        { success: false, error: `Invalid template key: ${key}` },
        { status: 404 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    // Rate limiting check
    if (!checkRateLimit(adminContext.user.id)) {
      return NextResponse.json(
        { success: false, error: 'Too many test emails requested. Please wait a minute before trying again.' },
        { status: 429 }
      );
    }

    const definition = SERVICE_EMAIL_REGISTRY[key];
    const detail = await getServiceEmailTemplateDetail(
      supabase,
      adminContext.organization.id,
      key
    );

    let bodyPayload: any = {};
    try {
      bodyPayload = await req.json();
    } catch {
      // Empty body is acceptable
    }

    // Default recipient to authenticated admin's verified email
    const recipientEmail = bodyPayload.recipientEmail || adminContext.user.email;
    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid recipient email address is required for test email' },
        { status: 400 }
      );
    }

    const subjectToRender = bodyPayload.subject || detail.effectiveSubject;
    const htmlToRender = bodyPayload.bodyHtml || detail.effectiveBodyHtml;
    const textToRender = bodyPayload.bodyText || detail.effectiveBodyText;
    const sampleData = {
      ...definition.sampleData,
      ...(bodyPayload.sampleData || {}),
    };

    const rendered = renderServiceEmail(key, sampleData, {
      override: {
        subject: `[TEST] ${subjectToRender}`,
        bodyHtml: htmlToRender,
        bodyText: textToRender,
        isActive: true,
      },
    });

    const dispatchResult = await dispatchTransactionalEmail({
      to: recipientEmail,
      subject: rendered.subject,
      template: key,
      data: sampleData,
      html: rendered.html,
      text: rendered.text,
      organizationId: adminContext.organization.id,
    });

    if (!dispatchResult.success) {
      return NextResponse.json(
        { success: false, error: dispatchResult.error || 'Failed to dispatch test email' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Test email sent to ${recipientEmail}`,
        messageId: dispatchResult.messageId,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error sending test email';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
