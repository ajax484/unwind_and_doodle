import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  validateSegmentRules,
  previewSegmentRules,
} from '@/services/marketing-segmentation.service';
import { SegmentRuleValidationError } from '@/types/marketing';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json().catch(() => ({}));

    if (!body.rules) {
      return NextResponse.json(
        { success: false, error: 'Segment rules are required for preview' },
        { status: 400 }
      );
    }

    const validatedRules = validateSegmentRules(body.rules);
    const limit = typeof body.limit === 'number' && body.limit > 0 ? Math.min(body.limit, 50) : 10;

    const preview = await previewSegmentRules(
      supabase,
      adminContext.organization.id,
      validatedRules,
      { limit }
    );

    return NextResponse.json(
      {
        success: true,
        count: preview.total,
        customers: preview.customers,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error previewing marketing segment';
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
