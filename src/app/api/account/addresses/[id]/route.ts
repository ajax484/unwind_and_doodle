import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { updateCustomerAddress, deleteCustomerAddress } from '@/services/customer-account.service';
import { z } from 'zod';

const UpdateAddressSchema = z.object({
  recipientName: z.string().min(2).optional(),
  phone: z.string().min(5).optional(),
  addressLine1: z.string().min(3).optional(),
  addressLine2: z.string().optional().nullable(),
  state: z.string().min(2).optional(),
  lga: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateAddressSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid address data' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const updated = await updateCustomerAddress(
      supabase,
      authContext.customer.id,
      id,
      parsed.data
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update address';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const supabase = getServiceSupabaseClient();

    await deleteCustomerAddress(supabase, authContext.customer.id, id);

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully',
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete address';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
