import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { listTeamMembers, listTeamInvitations } from '@/services/team.service';
import { requirePermission } from '@/services/permission.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    requirePermission(adminContext, 'team.read');

    const supabase = getServiceSupabaseClient();

    const [members, invitations] = await Promise.all([
      listTeamMembers(supabase, adminContext.organization.id),
      listTeamInvitations(supabase, adminContext.organization.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        members,
        invitations,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch team details';
    const isForbidden = msg.includes('Forbidden') || msg.includes('Insufficient privileges');
    const isUnauthenticated = msg.includes('Authentication required') || msg.includes('session');

    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: isUnauthenticated ? 401 : isForbidden ? 403 : 500 }
    );
  }
}
