import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';
import { PaystackPaymentProvider } from '@/services/payment/paystack.provider';
import { commitOrderReservations } from '@/services/inventory.service';
import { incrementDiscountUsageAtomic } from '@/services/discount.service';
import { publishDomainEvent } from '@/services/events.service';
import { ORDER_STATUS, PAYMENT_STATUS, DOMAIN_EVENT_TYPES, CURRENCY } from '@/lib/constants';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const txRef =
      url.searchParams.get('reference') ||
      url.searchParams.get('trxref') ||
      url.searchParams.get('tx_ref');

    if (!txRef) {
      return NextResponse.json(
        { success: false, error: 'Transaction reference is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();

    // 1. Locate payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_reference', txRef.trim())
      .maybeSingle();

    if (payErr || !payment) {
      return NextResponse.json(
        { success: false, error: `Payment record not found for reference ${txRef}` },
        { status: 404 }
      );
    }

    // 2. Fetch associated order
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_number, total, status, customer_id, organization_id, discount_id')
      .eq('id', payment.order_id)
      .maybeSingle();

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Associated order not found' },
        { status: 404 }
      );
    }

    // 3. If payment is already marked successful, return immediately
    if (payment.status === PAYMENT_STATUS.SUCCESSFUL) {
      return NextResponse.json(
        {
          success: true,
          orderNumber: order.order_number,
          orderStatus: order.status,
          paymentStatus: payment.status,
          verified: true,
        },
        { status: 200 }
      );
    }

    // 4. Verify transaction with Paystack API directly
    const provider = new PaystackPaymentProvider();
    const verifiedTx = await provider.verifyTransaction(txRef);

    if (
      verifiedTx.status === 'successful' &&
      Math.abs(verifiedTx.amount - payment.amount) < 0.01 &&
      verifiedTx.currency.toUpperCase() === CURRENCY.NGN
    ) {
      // Update payment
      await supabase
        .from('payments')
        .update({
          status: PAYMENT_STATUS.SUCCESSFUL,
          metadata: {
            ...(payment.metadata as Record<string, unknown> || {}),
            channel: verifiedTx.channel,
            paid_at: verifiedTx.paidAt,
            verified_via: 'return_callback',
          },
        })
        .eq('id', payment.id);

      // Update order_payment_requests if manual order
      await supabase
        .from('order_payment_requests')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as Database['public']['Tables']['order_payment_requests']['Update'])
        .eq('order_id', order.id);

      // Commit inventory reservation
      await commitOrderReservations(supabase, order.id);

      if ((order as Record<string, unknown>).discount_id) {
        await incrementDiscountUsageAtomic(
          supabase,
          (order as Record<string, unknown>).discount_id as string,
          (order as Record<string, unknown>).organization_id as string
        );
      }

      // Update order status to pending and payment_status if present
      const orderUpdates: Record<string, unknown> = {
        status: ORDER_STATUS.PENDING,
        updated_at: new Date().toISOString(),
      };
      if ('payment_status' in (order as Record<string, unknown>)) {
        orderUpdates.payment_status = PAYMENT_STATUS.SUCCESSFUL;
      }

      await supabase
        .from('orders')
        .update(orderUpdates as any)
        .eq('id', order.id);

      // Insert status history
      await supabase.from('order_status_history').insert({
        order_id: order.id,
        to_status: ORDER_STATUS.PENDING,
        from_status: ORDER_STATUS.CREATED,
        note: `Payment verified on callback return via reference ${txRef}`,
      });

      // Insert audit log
      if (order.organization_id) {
        await supabase.from('audit_logs').insert({
          organization_id: order.organization_id,
          actor_id: null,
          action: 'update',
          entity_type: 'payment',
          entity_id: payment.id,
          after_data: {
            status: PAYMENT_STATUS.SUCCESSFUL,
            provider: payment.provider,
            amount: payment.amount,
            reference: txRef,
            source: 'return_callback',
          },
        });
      }

      // Emit domain event
      await publishDomainEvent(supabase, {
        eventType: DOMAIN_EVENT_TYPES.PAYMENT_COMPLETED,
        aggregateType: 'payment',
        aggregateId: payment.id,
        payload: {
          paymentId: payment.id,
          orderId: order.id,
          orderNumber: order.order_number,
          provider: payment.provider,
          providerReference: txRef,
          amount: payment.amount,
          currency: payment.currency,
          paidAt: verifiedTx.paidAt || new Date().toISOString(),
          customerId: order.customer_id,
        },
      });

      return NextResponse.json(
        {
          success: true,
          orderNumber: order.order_number,
          orderStatus: ORDER_STATUS.PENDING,
          paymentStatus: PAYMENT_STATUS.SUCCESSFUL,
          verified: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderNumber: order.order_number,
        orderStatus: order.status,
        paymentStatus: payment.status,
        verified: false,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error verifying payment callback';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
