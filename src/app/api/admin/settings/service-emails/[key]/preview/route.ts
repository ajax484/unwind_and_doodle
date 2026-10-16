import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  SERVICE_EMAIL_REGISTRY,
  getServiceEmailTemplateDetail,
  renderServiceEmail,
} from '@/services/service-email.service';
import { EmailNotificationTemplate } from '@/types/notification';

function isValidTemplateKey(key: string): key is EmailNotificationTemplate {
  return key in SERVICE_EMAIL_REGISTRY;
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
      // Empty body is acceptable; falls back to current effective template
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
        subject: subjectToRender,
        bodyHtml: htmlToRender,
        bodyText: textToRender,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error rendering template preview';
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
