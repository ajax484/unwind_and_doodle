import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { dispatchDueScheduledCampaigns } from '@/services/marketing-dispatcher.service';

export async function POST(req: NextRequest) {
  try {
    // Optional cron secret check or admin auth
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      // Authorized via cron secret
    } else {
      // Authorized via admin session
      await getAuthenticatedAdmin(req);
    }

    const supabase = getServiceSupabaseClient();
    const results = await dispatchDueScheduledCampaigns(supabase);

    return NextResponse.json(
      {
        success: true,
        dispatched: results.length,
        results,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error executing scheduled campaigns';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
