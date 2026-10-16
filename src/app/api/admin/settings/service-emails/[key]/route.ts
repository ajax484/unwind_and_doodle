import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  SERVICE_EMAIL_REGISTRY,
  getServiceEmailTemplateDetail,
  upsertServiceEmailOverride,
  resetServiceEmailTemplate,
} from '@/services/service-email.service';
import { EmailNotificationTemplate } from '@/types/notification';

const UpdateTemplateSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(300, 'Subject is too long'),
  bodyHtml: z.string().min(1, 'HTML body is required'),
  bodyText: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

function isValidTemplateKey(key: string): key is EmailNotificationTemplate {
  return key in SERVICE_EMAIL_REGISTRY;
}

export async function GET(
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

    const detail = await getServiceEmailTemplateDetail(
      supabase,
      adminContext.organization.id,
      key
    );

    return NextResponse.json({ success: true, data: detail }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching template';
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

export async function PUT(
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

    // Only owners and admins can manage service emails
    if (adminContext.membership.role !== 'owner' && adminContext.membership.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or owner role required to edit service email templates' },
        { status: 403 }
      );
    }

    const rawBody = await req.json();
    const parsed = UpdateTemplateSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updated = await upsertServiceEmailOverride(
      supabase,
      adminContext.organization.id,
      key,
      {
        subject: parsed.data.subject,
        bodyHtml: parsed.data.bodyHtml,
        bodyText: parsed.data.bodyText,
        isActive: parsed.data.isActive ?? true,
      },
      adminContext.user.id
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating template';
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

export async function DELETE(
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

    // Only owners and admins can reset service emails
    if (adminContext.membership.role !== 'owner' && adminContext.membership.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin or owner role required to reset service email templates' },
        { status: 403 }
      );
    }

    const reset = await resetServiceEmailTemplate(
      supabase,
      adminContext.organization.id,
      key
    );

    return NextResponse.json({ success: true, data: reset }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error resetting template';
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
