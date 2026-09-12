import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from '@/services/marketing-campaign.service';

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
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: campaign }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error fetching campaign';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json();

    const campaign = await updateCampaign(
      supabase,
      adminContext.organization.id,
      id,
      {
        name: body.name,
        type: body.type,
        status: body.status,
        subject: body.subject,
        preview_text: body.preview_text,
        sender_name: body.sender_name,
        sender_email: body.sender_email,
        content: body.content,
        segment_id: body.segment_id,
        scheduled_at: body.scheduled_at,
      }
    );

    return NextResponse.json({ success: true, data: campaign }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error updating campaign';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;

    await deleteCampaign(supabase, adminContext.organization.id, id);

    return NextResponse.json({ success: true, message: 'Campaign deleted successfully' }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error deleting campaign';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    const isNotFound = errorMessage.includes('not found');
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: isAuth ? 403 : isNotFound ? 404 : 400 }
    );
  }
}
