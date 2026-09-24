import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { executeHistoricalImport } from '@/services/historical-import.service';
import { ExecuteImportInput } from '@/types/historical-import';

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const body = (await req.json()) as ExecuteImportInput;
    const { csvContent, fileName, confirmedProductMappings } = body;

    if (!csvContent || typeof csvContent !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid csvContent in request body' },
        { status: 400 }
      );
    }

    if (!confirmedProductMappings || typeof confirmedProductMappings !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Missing confirmedProductMappings object' },
        { status: 400 }
      );
    }

    const result = await executeHistoricalImport(
      supabase,
      {
        csvContent,
        fileName: fileName || 'import.csv',
        confirmedProductMappings,
      },
      {
        organizationId: adminContext.organization.id,
        adminUserId: adminContext.user.id,
      }
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error executing import';
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
