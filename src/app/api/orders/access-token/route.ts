import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { generateOrderAccessToken } from '@/lib/order-token';
import { z } from 'zod';

const OrderAccessTokenSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  email: z.string().email('Please enter a valid email address'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = OrderAccessTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid parameters' },
        { status: 400 }
      );
    }

    const { orderNumber, email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const supabase = getServiceSupabaseClient();

    // 1. Fetch order
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('id, order_number, email, customer_id')
      .eq('order_number', orderNumber.trim())
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json(
        { success: false, error: 'No order found matching this order number and email' },
        { status: 404 }
      );
    }

    // 2. Fetch customer email if order.email is null
    let orderEmail = (order.email || '').trim().toLowerCase();
    if (!orderEmail && order.customer_id) {
      const { data: cust } = await supabase
        .from('customers')
        .select('email')
        .eq('id', order.customer_id)
        .maybeSingle();
      if (cust?.email) orderEmail = cust.email.trim().toLowerCase();
    }

    if (orderEmail !== normalizedEmail) {
      return NextResponse.json(
        { success: false, error: 'No order found matching this order number and email' },
        { status: 404 }
      );
    }

    // 3. Generate signed temporary token
    const token = generateOrderAccessToken(order.order_number, normalizedEmail);

    return NextResponse.json({
      success: true,
      token,
      orderNumber: order.order_number,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error validating order access';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
