import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { getCustomerAddresses, createCustomerAddress } from '@/services/customer-account.service';
import { z } from 'zod';

const AddressSchema = z.object({
  recipientName: z.string().min(2, 'Recipient name is required'),
  phone: z.string().min(5, 'Phone number is required'),
  addressLine1: z.string().min(3, 'Street address is required'),
  addressLine2: z.string().optional().nullable(),
  state: z.string().min(2, 'State is required'),
  lga: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const addresses = await getCustomerAddresses(supabase, authContext.customer.id);

    return NextResponse.json({
      success: true,
      data: addresses,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch addresses';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = AddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid address details' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const newAddress = await createCustomerAddress(
      supabase,
      authContext.customer.id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: newAddress,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create address';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
