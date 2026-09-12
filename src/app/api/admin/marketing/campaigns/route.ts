import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getCampaigns, createCampaign } from '@/services/marketing-campaign.service';
import { MarketingCampaignStatus } from '@/types/marketing';

export async function GET(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') as MarketingCampaignStatus) || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getCampaigns(
      supabase,
      adminContext.organization.id,
      { status },
      { page, limit }
    );

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching campaigns';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const body = await req.json();

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Campaign name is required.' },
        { status: 400 }
      );
    }

    const campaign = await createCampaign(supabase, adminContext.organization.id, {
      name: body.name.trim(),
      type: 'email',
      status: body.status || 'draft',
      subject: body.subject?.trim() || null,
      preview_text: body.preview_text?.trim() || null,
      sender_name: body.sender_name?.trim() || null,
      sender_email: body.sender_email?.trim() || null,
      content: body.content ?? {},
      segment_id: body.segment_id || null,
      scheduled_at: body.scheduled_at || null,
      created_by: adminContext.user.id,
    });

    return NextResponse.json({ success: true, data: campaign }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error creating campaign';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
