import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getSegments, createSegment } from '@/services/marketing-segment.service';
import { validateSegmentRules } from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

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

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json().catch(() => ({}));

    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    if (!rawName) {
      return NextResponse.json(
        { success: false, error: 'Segment name is required' },
        { status: 400 }
      );
    }
    if (rawName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Segment name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    const validatedRules = validateSegmentRules(body.rules);

    const segment = await createSegment(supabase, adminContext.organization.id, {
      name: rawName,
      description: typeof body.description === 'string' ? body.description.trim() || null : null,
      rules: validatedRules,
      active: body.active !== undefined ? Boolean(body.active) : true,
    });

    return NextResponse.json({ success: true, data: segment }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating marketing segment';
    if (error instanceof SegmentRuleValidationError) {
      return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
    }
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
