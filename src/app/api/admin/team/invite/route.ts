import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { createTeamInvitation } from '@/services/team.service';
import { InviteTeamMemberSchema } from '@/types/admin-team';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const body = await req.json();

    const parseResult = InviteTeamMemberSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const invitation = await createTeamInvitation(supabase, adminContext, parseResult.data);

    return NextResponse.json(
      {
        success: true,
        data: invitation,
        message: `Invitation successfully sent to ${invitation.email}`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to send team invitation';
    const isValidation = msg.includes('Invalid invitation') || msg.includes('already exists');
    const isForbidden = msg.includes('Forbidden') || msg.includes('Insufficient privileges');
    const isUnauthenticated = msg.includes('Authentication required') || msg.includes('session');

    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      {
        status: isUnauthenticated ? 401 : isForbidden ? 403 : isValidation ? 400 : 500,
      }
    );
  }
}
