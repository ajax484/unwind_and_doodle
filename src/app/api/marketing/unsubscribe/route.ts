import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { verifyMarketingUnsubscribeToken } from '@/lib/marketing-token';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || '';

  return handleUnsubscribe(token);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token : '';

  return handleUnsubscribe(token);
}

async function handleUnsubscribe(token: string) {
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Unsubscribe token is required' },
      { status: 400 }
    );
  }

  const verification = verifyMarketingUnsubscribeToken(token);
  if (!verification.valid || !verification.customerId || !verification.organizationId) {
    return NextResponse.json(
      { success: false, error: verification.error || 'Invalid or tampered unsubscribe token' },
      { status: 400 }
    );
  }

  const supabase = getServiceSupabaseClient();
  const now = new Date().toISOString();

  // 1. Update customer consent in database
  const { data: customer, error: custError } = await supabase
    .from('customers')
    .update({
      email_marketing_consent: false,
      updated_at: now,
    })
    .eq('id', verification.customerId)
    .eq('organization_id', verification.organizationId)
    .select('id, email')
    .maybeSingle();

  if (custError || !customer) {
    return NextResponse.json(
      { success: false, error: 'Customer not found or already unsubscribed' },
      { status: 404 }
    );
  }

  // 2. If token included campaignId, update recipient record and event log
  if (verification.campaignId) {
    const { data: recipient } = await supabase
      .from('marketing_campaign_recipients')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: now,
      })
      .eq('campaign_id', verification.campaignId)
      .eq('customer_id', verification.customerId)
      .select('id')
      .maybeSingle();

    if (recipient) {
      await supabase.from('marketing_email_events').insert({
        campaign_id: verification.campaignId,
        campaign_recipient_id: recipient.id,
        customer_id: verification.customerId,
        event_type: 'unsubscribed',
        metadata: { source: 'token_link' },
        occurred_at: now,
      });
    }
  }

  return NextResponse.json(
    {
      success: true,
      message: 'You have been successfully unsubscribed from marketing emails.',
      customerEmail: customer.email,
    },
    { status: 200 }
  );
}
