import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { AdminAuditLogFilterSchema } from '@/types/admin-audit-log';
import { listAdminAuditLogs } from '@/services/admin-audit-log.service';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();

    // 1. Authenticate and resolve admin context
    const adminContext = await getAuthenticatedAdmin(req);

    // 2. Strict Role Authorization (Only owner and admin can view system-wide audit logs, aligning with database RLS)
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

    // 3. Parse and validate query parameters
    const url = new URL(req.url);
    const rawFilters = {
      search: url.searchParams.get('search') || undefined,
      action: url.searchParams.get('action') || undefined,
      entityType: url.searchParams.get('entityType') || undefined,
      actorType: url.searchParams.get('actorType') || undefined,
      actorId: url.searchParams.get('actorId') || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      sortBy: url.searchParams.get('sortBy') || undefined,
      page: url.searchParams.get('page') || undefined,
      limit: url.searchParams.get('limit') || undefined,
    };

    const parseResult = AdminAuditLogFilterSchema.safeParse(rawFilters);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid audit log filter parameters',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // 4. Fetch audit logs scoped to the admin's organization
    const data = await listAdminAuditLogs(supabase, {
      ...parseResult.data,
      organizationId: adminContext.organization.id,
    });

    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching audit logs';
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
