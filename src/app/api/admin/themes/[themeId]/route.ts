import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  updateTheme,
  toggleThemeActive,
  deleteTheme,
} from '@/services/theme.service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { themeId } = await params;
    const body = await req.json();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const theme = await updateTheme(supabase, orgId, themeId, body);

    return NextResponse.json({ success: true, theme }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error updating theme';
    const isValidation = message.toLowerCase().includes('already exists') || message.toLowerCase().includes('required');
    const status = message.toLowerCase().includes('auth') ? 401 : isValidation ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { themeId } = await params;
    const body = await req.json();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const isActive = Boolean(body.isActive ?? body.is_active);
    await toggleThemeActive(supabase, orgId, themeId, isActive);

    return NextResponse.json({ success: true, isActive }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error toggling theme active status';
    const status = message.toLowerCase().includes('auth') ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ themeId: string }> }
) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { themeId } = await params;
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    await deleteTheme(supabase, orgId, themeId);

    return NextResponse.json({ success: true, message: 'Theme deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error deleting theme';
    const status = message.toLowerCase().includes('auth') ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
