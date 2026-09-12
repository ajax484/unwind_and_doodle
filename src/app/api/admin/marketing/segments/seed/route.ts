import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { seedDefaultSegments } from '@/services/marketing-segment.service';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const seeded = await seedDefaultSegments(supabase, adminContext.organization.id);

    return NextResponse.json(
      {
        success: true,
        data: seeded,
        count: seeded.length,
        message:
          seeded.length > 0
            ? `Successfully created ${seeded.length} starter segment(s).`
            : 'All starter segments already exist.',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error seeding starter segments';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : 500 }
    );
  }
}
