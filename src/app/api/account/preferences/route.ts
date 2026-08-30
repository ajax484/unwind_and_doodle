import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { updateMarketingPreferences } from '@/services/customer-account.service';
import { z } from 'zod';

const PreferencesSchema = z.object({
  emailMarketingConsent: z.boolean().optional(),
  whatsappMarketingConsent: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = PreferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid preferences data' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const updated = await updateMarketingPreferences(
      supabase,
      authContext.customer.id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update preferences';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
