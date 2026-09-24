import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getImportBatches } from '@/services/historical-import.service';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const batches = await getImportBatches(supabase, adminContext.organization.id);

    return NextResponse.json({ success: true, data: batches }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching import batches';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
