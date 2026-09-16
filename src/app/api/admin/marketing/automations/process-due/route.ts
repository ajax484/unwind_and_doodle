import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { processDueMarketingAutomations } from '@/services/marketing-executor.service';

export async function POST(req: NextRequest) {
  try {
    // Optional cron secret check or admin auth
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    let organizationId: string | undefined;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret - can process across all or specific org
    } else {
      // Authorized via admin session - scoped to admin org
      const adminContext = await getAuthenticatedAdmin(req);
      organizationId = adminContext.organization.id;
    }

    const supabase = getServiceSupabaseClient();
    const results = await processDueMarketingAutomations(supabase, { organizationId });

    return NextResponse.json(
      {
        success: true,
        ...results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error executing due marketing automations';
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
