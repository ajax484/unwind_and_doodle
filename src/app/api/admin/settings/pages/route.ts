import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { listStorefrontPages } from '@/services/storefront-pages.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const pages = await listStorefrontPages(supabase, adminContext.organization.id);
    return NextResponse.json({ success: true, data: pages }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load storefront pages';
    const isAuth = message.includes('Authentication') || message.includes('Forbidden') || message.includes('Unauthorized');
    return NextResponse.json({ success: false, error: message }, { status: isAuth ? 403 : 500 });
  }
}
