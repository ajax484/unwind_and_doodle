import { NextRequest, NextResponse } from 'next/server';
import { deleteCustomerNote } from '@/services/admin-customer.service';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const adminContext = await getAuthenticatedAdmin(req);

    const { id: customerId, noteId } = await params;
    if (!customerId || !noteId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and Note ID are required' },
        { status: 400 }
      );
    }

    const result = await deleteCustomerNote(
      supabase,
      customerId,
      noteId,
      adminContext.user.id,
      adminContext.organization.id
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting note';
    const isAuthError =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('privileges');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthError ? 403 : 500 }
    );
  }
}
