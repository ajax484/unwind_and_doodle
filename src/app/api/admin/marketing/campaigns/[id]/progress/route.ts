import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getCampaignById } from '@/services/marketing-campaign.service';
import { getCampaignRecipientCounts } from '@/services/marketing-recipient.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    const campaign = await getCampaignById(supabase, adminContext.organization.id, id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found for this organization' },
        { status: 404 }
      );
    }

    const counts = await getCampaignRecipientCounts(supabase, id);

    return NextResponse.json(
      {
        success: true,
        data: {
          campaign: {
            id: campaign.id,
            status: campaign.status,
            started_at: campaign.started_at,
            completed_at: campaign.completed_at,
          },
          counts,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching campaign progress';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
