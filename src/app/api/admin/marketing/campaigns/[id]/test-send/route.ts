import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedAdmin } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import {
  getCampaignById,
  validateCampaignForDelivery,
  sendCampaignTestEmailPlaceholder,
} from '@/services/marketing-campaign.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminContext = await getAuthenticatedAdmin(req);
    const supabase = getServiceSupabaseClient();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const recipientEmail = typeof body.recipient_email === 'string' ? body.recipient_email.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      return NextResponse.json(
        { success: false, error: 'A valid test recipient email address is required.' },
        { status: 400 }
      );
    }

    const campaign = await getCampaignById(supabase, adminContext.organization.id, id);
    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found for this organization.' },
        { status: 404 }
      );
    }

    // Server-side validation of campaign completeness
    const validation = validateCampaignForDelivery(campaign);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: `Campaign validation failed: ${validation.errors.join(', ')}`,
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Call placeholder boundary
    const result = await sendCampaignTestEmailPlaceholder(recipientEmail, campaign);

    // Controlled response indicating email provider is not yet configured (Step 1F requirement)
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error: result.message,
      },
      { status: 501 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error sending test email';
    const isAuth =
      errorMessage.includes('Unauthorized') ||
      errorMessage.includes('Forbidden') ||
      errorMessage.includes('Authentication required');
    return NextResponse.json({ success: false, error: errorMessage }, { status: isAuth ? 403 : 500 });
  }
}
