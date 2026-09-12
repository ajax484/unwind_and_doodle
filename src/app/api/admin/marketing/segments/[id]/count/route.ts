import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getSegmentCustomerCount } from '@/services/marketing-segmentation.service';

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

    const count = await getSegmentCustomerCount(
      supabase,
      adminContext.organization.id,
      id
    );

    return NextResponse.json({ success: true, count }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error calculating segment audience';
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
