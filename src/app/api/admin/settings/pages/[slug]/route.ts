import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { StorefrontPageSlugSchema, UpdateStorefrontPageSchema } from '@/types/storefront-pages';
import { getStorefrontPage, upsertStorefrontPage } from '@/services/storefront-pages.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { slug: rawSlug } = await params;
    const slugResult = StorefrontPageSlugSchema.safeParse(rawSlug);
    if (!slugResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid page slug' }, { status: 400 });
    }

    const supabase = getServiceSupabaseClient();
    const page = await getStorefrontPage(supabase, slugResult.data, adminContext.organization.id);
    return NextResponse.json({ success: true, data: page }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load page';
    const isAuth = message.includes('Authentication') || message.includes('Forbidden') || message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { slug: rawSlug } = await params;
    const slugResult = StorefrontPageSlugSchema.safeParse(rawSlug);
    if (!slugResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid page slug' }, { status: 400 });
    }

    const body = await req.json();
    const parsed = UpdateStorefrontPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid page content',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const saved = await upsertStorefrontPage(
      supabase,
      adminContext.organization.id,
      slugResult.data,
      parsed.data,
      adminContext.user.id
    );

    try {
      revalidatePath(`/${slugResult.data}`);
    } catch {
      // Non-blocking in test environments
    }

    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save page';
    const isAuth = message.includes('Authentication') || message.includes('Forbidden') || message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
