import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getSegmentById,
  updateSegment,
  deleteSegment,
} from '@/services/marketing-segment.service';
import { validateSegmentRules } from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    const segment = await getSegmentById(supabase, adminContext.organization.id, id);
    if (!segment) {
      return NextResponse.json(
        { success: false, error: 'Segment not found for this organization' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: segment }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching marketing segment';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const updates: {
      name?: string;
      description?: string | null;
      rules?: unknown;
      active?: boolean;
    } = {};

    if (body.name !== undefined) {
      const rawName = typeof body.name === 'string' ? body.name.trim() : '';
      if (!rawName) {
        return NextResponse.json(
          { success: false, error: 'Segment name cannot be empty' },
          { status: 400 }
        );
      }
      if (rawName.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Segment name cannot exceed 100 characters' },
          { status: 400 }
        );
      }
      updates.name = rawName;
    }

    if (body.description !== undefined) {
      updates.description = typeof body.description === 'string' ? body.description.trim() || null : null;
    }

    if (body.rules !== undefined) {
      updates.rules = validateSegmentRules(body.rules);
    }

    if (body.active !== undefined) {
      updates.active = Boolean(body.active);
    }

    const updated = await updateSegment(
      supabase,
      adminContext.organization.id,
      id,
      updates as any
    );

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating marketing segment';
    if (error instanceof SegmentRuleValidationError) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found') || errorMessage.includes('does not exist');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Segment ID is required' },
        { status: 400 }
      );
    }

    await deleteSegment(supabase, adminContext.organization.id, id);

    return NextResponse.json(
      { success: true, message: 'Marketing segment deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting marketing segment';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found') || errorMessage.includes('does not exist');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : 500 }
    );
  }
}
