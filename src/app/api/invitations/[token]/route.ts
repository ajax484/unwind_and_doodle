import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getInvitationByToken } from '@/services/team.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing invitation token' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const detail = await getInvitationByToken(supabase, token);

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Invalid invitation link';
    return NextResponse.json(
      {
        success: false,
        error: msg,
      },
      { status: 404 }
    );
  }
}
