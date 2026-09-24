import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { parseAndValidateBumpaData } from '@/services/historical-import.service';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const body = await req.json();
    const { csvContent, fileName } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid csvContent in request body' },
        { status: 400 }
      );
    }

    const report = await parseAndValidateBumpaData(
      csvContent,
      adminContext.organization.id,
      supabase,
      fileName || 'import.csv'
    );

    return NextResponse.json({ success: true, data: report }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error validating import file';
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
