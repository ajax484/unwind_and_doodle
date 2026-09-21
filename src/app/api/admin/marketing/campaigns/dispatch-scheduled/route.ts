import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { dispatchDueScheduledCampaigns } from '@/services/marketing-dispatcher.service';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    let organizationId: string | undefined;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret
      const { searchParams } = new URL(req.url);
      const queryOrgId = searchParams.get('organizationId') || searchParams.get('organization_id');
      if (queryOrgId) {
        organizationId = queryOrgId;
      }
    } else {
      // Authorized via admin session
      const adminContext = await getAuthenticatedAdmin(req);
      organizationId = adminContext.organization.id;
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;

    const supabase = getServiceSupabaseClient();
    const results = await dispatchDueScheduledCampaigns(supabase, {
      limit: !isNaN(limit) ? limit : 10,
      organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        processed: results.length,
        dispatched: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error executing scheduled campaigns';
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
