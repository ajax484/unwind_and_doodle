import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { revalidateStorefrontCatalog } from '@/lib/cache-revalidation';
import { HomepageConfigSchema } from '@/types/homepage-settings';
import {
  getHomepageSettings,
  upsertHomepageSettings,
} from '@/services/homepage-settings.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const settings = await getHomepageSettings(supabase, adminContext.organization.id);
    return NextResponse.json({ success: true, data: settings }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load homepage settings';
    const isAuth =
      message.includes('Authentication') ||
      message.includes('Forbidden') ||
      message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const body = await req.json();
    const parsed = HomepageConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || 'Invalid homepage configuration',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const saved = await upsertHomepageSettings(
      supabase,
      adminContext.organization.id,
      parsed.data,
      adminContext.user.id
    );

    revalidateStorefrontCatalog();

    return NextResponse.json({ success: true, data: saved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to save homepage settings';
    const isAuth =
      message.includes('Authentication') ||
      message.includes('Forbidden') ||
      message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
