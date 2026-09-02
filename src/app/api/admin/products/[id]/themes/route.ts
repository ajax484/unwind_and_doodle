import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getProductThemes,
  assignThemesToProduct,
} from '@/services/theme.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id: productId } = await params;
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const themes = await getProductThemes(supabase, orgId, productId);

    return NextResponse.json({ success: true, themes }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error fetching product themes';
    const status = message.toLowerCase().includes('auth') ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id: productId } = await params;
    const body = await req.json();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const themeIds: string[] = body.themeIds || body.theme_ids || [];

    await assignThemesToProduct(supabase, orgId, productId, themeIds);

    return NextResponse.json({ success: true, message: 'Themes assigned successfully' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error assigning themes to product';
    const status = message.toLowerCase().includes('auth') ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
