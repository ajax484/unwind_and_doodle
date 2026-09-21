import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getPublicPaymentMethods } from '@/services/payment-settings.service';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceSupabaseClient();
    const url = new URL(req.url);
    const requestedOrgId =
      url.searchParams.get('organizationId') ||
      req.headers.get('x-organization-id');

    let orgId = requestedOrgId || DEFAULT_ORGANIZATION_ID;
    if (!requestedOrgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (org?.id) {
        orgId = org.id;
      }
    }

    const paymentMethods = await getPublicPaymentMethods(supabase, orgId);
    return NextResponse.json({ success: true, data: paymentMethods }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error fetching enabled payment methods';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
