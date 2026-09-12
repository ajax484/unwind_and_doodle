import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getCampaignById } from '@/services/marketing-campaign.service';
import { getCampaignRecipients } from '@/services/marketing-recipient.service';
import { MarketingRecipientStatus } from '@/types/marketing';

/**
 * Lists recipients for a specific campaign with optional status filtering, search, and pagination.
 * Scoped to the authenticated admin's organization.
 */
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

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as MarketingRecipientStatus) || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const result = await getCampaignRecipients(
      supabase,
      id,
      { status, search },
      { page, limit }
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error fetching campaign recipients';
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
