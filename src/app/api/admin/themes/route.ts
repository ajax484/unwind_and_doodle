import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  listOrganizationThemes,
  createTheme,
  reorderThemes,
} from '@/services/theme.service';

export async function GET(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const themes = await listOrganizationThemes(supabase, orgId);

    return NextResponse.json({ success: true, themes }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error listing themes';
    const status = message.toLowerCase().includes('auth') ? 401 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    const theme = await createTheme(supabase, orgId, body);

    return NextResponse.json({ success: true, theme }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error creating theme';
    const isValidation = message.toLowerCase().includes('already exists') || message.toLowerCase().includes('required') || message.toLowerCase().includes('invalid');
    const status = message.toLowerCase().includes('auth') ? 401 : isValidation ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();
    const orgId = admin.organization?.id || admin.membership?.organizationId;

    await reorderThemes(supabase, orgId, body);

    return NextResponse.json({ success: true, message: 'Themes reordered successfully' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error reordering themes';
    const status = message.toLowerCase().includes('auth') ? 401 : 400;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
