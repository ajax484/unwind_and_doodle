import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';

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
    const customerId = authContext.customer.id;

    // Fetch orders strictly belonging to this customer
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch order history' },
        { status: 500 }
      );
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const orderIds = orders.map((o) => o.id);

    // Fetch order items for previews
    const { data: items } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, product_name, quantity, unit_price, total')
      .in('order_id', orderIds);

    const productIds = Array.from(new Set((items || []).map((i) => i.product_id)));
    const { data: images } = productIds.length > 0
      ? await supabase
          .from('product_images')
          .select('product_id, storage_path, sort_order')
          .in('product_id', productIds)
      : { data: [] };

    const imageMap = new Map<string, string>();
    for (const img of images || []) {
      if (img.sort_order === 0 || !imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.storage_path);
      }
    }

    const itemsByOrder = new Map<string, typeof items>();
    for (const it of items || []) {
      if (!itemsByOrder.has(it.order_id)) {
        itemsByOrder.set(it.order_id, []);
      }
      itemsByOrder.get(it.order_id)!.push(it);
    }

    const formattedOrders = orders.map((order) => {
      const orderItemsList = itemsByOrder.get(order.id) || [];
      const totalItemCount = orderItemsList.reduce((acc, item) => acc + item.quantity, 0);

      return {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        deliveryFee: order.shipping_fee,
        totalAmount: order.total,
        currency: 'NGN',
        createdAt: order.created_at,
        totalItemCount,
        itemsPreview: orderItemsList.slice(0, 3).map((it) => ({
          productId: it.product_id,
          productName: it.product_name || 'Product',
          quantity: it.quantity,
          image: imageMap.get(it.product_id) || null,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedOrders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch orders';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
