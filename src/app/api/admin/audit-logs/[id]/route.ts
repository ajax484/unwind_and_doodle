import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getAdminAuditLogById } from '@/services/admin-audit-log.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid audit log ID' },
        { status: 400 }
      );
    }

    // 1. Authenticate and resolve admin context
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Strict Role Authorization
    const role = adminContext.membership?.role?.toLowerCase();
    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: `Forbidden: Insufficient privileges. Role '${adminContext.membership?.role}' cannot access organization audit logs.`,
        },
        { status: 403 }
      );
    }

    // 3. Fetch single audit log scoped to tenant organization
    const record = await getAdminAuditLogById(supabase, id, adminContext.organization.id);

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Audit log record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching audit log detail';
    const isAuthRequired =
      errorMessage.includes('Authentication required') ||
      errorMessage.includes('No session token') ||
      errorMessage.includes('Invalid or expired session');
    const isForbidden =
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Insufficient privileges') ||
      errorMessage.includes('not an active member');

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuthRequired ? 401 : isForbidden ? 403 : 500 }
    );
  }
}
