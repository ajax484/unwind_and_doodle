import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getSegments } from '@/services/marketing-segment.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const activeParam = searchParams.get('active');
    const active = activeParam !== null ? activeParam === 'true' : undefined;

    const segments = await getSegments(supabase, adminContext.organization.id, {
      search,
      active,
    });

    return NextResponse.json({ success: true, data: segments.data, total: segments.total }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching marketing segments';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
