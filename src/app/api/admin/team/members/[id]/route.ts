import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { updateMemberRole, removeTeamMember } from '@/services/team.service';
import { UpdateMemberRoleSchema } from '@/types/admin-team';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing team member ID' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parseResult = UpdateMemberRoleSchema.safeParse(body);
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
    const updated = await updateMemberRole(
      supabase,
      adminContext,
      id,
      parseResult.data.role
    );

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Member role successfully updated',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update member role';
    const isForbidden = msg.includes('Forbidden') || msg.includes('Insufficient privileges') || msg.includes('Cannot demote');
    const isNotFound = msg.includes('not found');
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing team member ID' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    await removeTeamMember(supabase, adminContext, id);

    return NextResponse.json({
      success: true,
      message: 'Team member successfully removed from organization',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to remove team member';
    const isForbidden = msg.includes('Forbidden') || msg.includes('Insufficient privileges') || msg.includes('Cannot remove');
    const isNotFound = msg.includes('not found');
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
