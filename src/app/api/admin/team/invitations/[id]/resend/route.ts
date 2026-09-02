import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { resendTeamInvitation } from '@/services/team.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation ID' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const updated = await resendTeamInvitation(supabase, adminContext, id);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Invitation resent to ${updated.email}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to resend invitation';
    const isNotFound = msg.includes('not found');
    const isForbidden = msg.includes('Forbidden') || msg.includes('Insufficient privileges');
    const isUnauthenticated = msg.includes('Authentication required') || msg.includes('session');

    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      {
        status: isUnauthenticated ? 401 : isForbidden ? 403 : isNotFound ? 404 : 500,
      }
    );
  }
}
