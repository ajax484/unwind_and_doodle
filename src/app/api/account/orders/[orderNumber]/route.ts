import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedCustomer } from '@/lib/auth-helpers';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { Database } from '@/lib/supabase/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const authContext = await getAuthenticatedCustomer(req);

    if (!authContext) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const { orderNumber } = await params;
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabaseClient();
    const customerId = authContext.customer.id;

    // 1. Fetch order with ownership verification
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber.trim())
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // STRICT IDOR CHECK: order must belong to the authenticated customer
    if (order.customer_id !== customerId) {
      return NextResponse.json(
        { success: false, error: 'Order not found' }, // Generic not found to prevent leaking existence
        { status: 404 }
      );
    }

    // 2. Fetch order items, status history, and payment details
    const [
      { data: orderItems },
      { data: payments },
      { data: statusHistory },
      { data: reviews },
    ] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', order.id),
      supabase.from('payments').select('*').eq('order_id', order.id),
      supabase.from('order_status_history').select('*').eq('order_id', order.id).order('created_at', { ascending: true }),
      supabase.from('reviews').select('product_id, rating, status').eq('order_id', order.id),
    ]);

    const reviewedProductIds = new Set((reviews || []).map((r) => r.product_id));

    // 3. Fetch products, images, and addons
    const itemIds = (orderItems || []).map((i) => i.id);
    const productIds = (orderItems || []).map((i) => i.product_id);

    const [{ data: products }, { data: images }, { data: addons }, { data: customizations }, { data: bundleComponents }] =
      await Promise.all([
        supabase.from('products').select('id, name, slug, product_type').in('id', productIds),
        supabase.from('product_images').select('product_id, storage_path, sort_order').in('product_id', productIds),
        itemIds.length > 0
          ? supabase.from('order_item_addons').select('*').in('order_item_id', itemIds)
          : Promise.resolve({ data: [] }),
        itemIds.length > 0
          ? supabase.from('customizations').select('*').in('order_item_id', itemIds)
          : Promise.resolve({ data: [] }),
        itemIds.length > 0
          ? supabase.from('order_item_bundle_components').select('*').in('order_item_id', itemIds)
          : Promise.resolve({ data: [] }),
      ]);

    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const imageMap = new Map<string, string>();
    for (const img of images || []) {
      if (img.sort_order === 0 || !imageMap.has(img.product_id)) {
        imageMap.set(img.product_id, img.storage_path);
      }
    }

    const custMap = new Map((customizations || []).map((c) => [c.order_item_id, c]));

    type BundleComponentRow = Database['public']['Tables']['order_item_bundle_components']['Row'];
    const bundleComponentsByItem = new Map<string, { name: string; quantityPerBundle: number; totalQuantity: number }[]>();
    for (const bc of (bundleComponents || []) as BundleComponentRow[]) {
      if (!bundleComponentsByItem.has(bc.order_item_id)) {
        bundleComponentsByItem.set(bc.order_item_id, []);
      }
      bundleComponentsByItem.get(bc.order_item_id)!.push({
        name: bc.product_name,
        quantityPerBundle: bc.quantity_per_bundle,
        totalQuantity: bc.total_quantity,
      });
    }

    // Fallback for live/legacy bundle items without order_item_bundle_components records
    const bundleProductIds = (products || []).filter((p) => p.product_type === 'bundle').map((p) => p.id);
    if (bundleProductIds.length > 0) {
      const { data: bItems } = await supabase
        .from('bundle_items')
        .select('*')
        .in('bundle_product_id', bundleProductIds);

      const compIds = (bItems || []).map((bi) => bi.component_product_id);
      if (compIds.length > 0) {
        const { data: compProds } = await supabase
          .from('products')
          .select('id, name')
          .in('id', compIds);

        const compNameMap = new Map((compProds || []).map((p) => [p.id, p.name]));
        const bItemsByBundle = new Map<string, typeof bItems>();
        for (const bi of bItems || []) {
          if (!bItemsByBundle.has(bi.bundle_product_id)) {
            bItemsByBundle.set(bi.bundle_product_id, []);
          }
          bItemsByBundle.get(bi.bundle_product_id)!.push(bi);
        }

        for (const item of orderItems || []) {
          const prod = productMap.get(item.product_id);
          if (prod?.product_type === 'bundle' && (!bundleComponentsByItem.has(item.id) || bundleComponentsByItem.get(item.id)!.length === 0)) {
            const bis = bItemsByBundle.get(item.product_id) || [];
            const formatted = bis.map((bi) => ({
              name: compNameMap.get(bi.component_product_id) || 'Component Product',
              quantityPerBundle: bi.quantity,
              totalQuantity: item.quantity * bi.quantity,
            }));
            bundleComponentsByItem.set(item.id, formatted);
          }
        }
      }
    }

    // Fetch addon products
    const addonProductIds = (addons || []).map((a) => a.addon_product_id);
    const { data: addonProducts } =
      addonProductIds.length > 0
        ? await supabase.from('products').select('id, name').in('id', addonProductIds)
        : { data: [] };
    const addonProductMap = new Map((addonProducts || []).map((p) => [p.id, p.name]));

    type AddonRow = Database['public']['Tables']['order_item_addons']['Row'];
    const addonsByItem = new Map<string, AddonRow[]>();
    for (const a of (addons || []) as AddonRow[]) {
      if (!addonsByItem.has(a.order_item_id)) {
        addonsByItem.set(a.order_item_id, []);
      }
      addonsByItem.get(a.order_item_id)!.push(a);
    }

    const formattedItems = (orderItems || []).map((item) => {
      const prod = productMap.get(item.product_id);
      const itemAddons = addonsByItem.get(item.id) || [];
      const itemBundleComps = bundleComponentsByItem.get(item.id) || [];
      const cust = custMap.get(item.id);

      return {
        id: item.id,
        productId: item.product_id,
        productName: item.product_name || prod?.name || 'Product',
        slug: prod?.slug || '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total,
        primaryImage: imageMap.get(item.product_id) || null,
        hasReviewed: reviewedProductIds.has(item.product_id),
        customization: cust ? { status: cust.status, notes: ((cust as Record<string, unknown>).notes as string | null) ?? null } : null,
        bundleComponents: itemBundleComps,
        addons: itemAddons.map((a) => ({
          name: a.product_name || addonProductMap.get(a.addon_product_id) || 'Add-on',
          quantity: a.quantity,
          unitPrice: a.unit_price,
          totalPrice: a.total,
        })),
      };
    });

    const payment = payments?.[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        discountTotal: order.discount_total,
        deliveryFee: order.shipping_fee,
        totalAmount: order.total,
        currency: 'NGN',
        createdAt: order.created_at,
        shippingAddress: order.shipping_address,
        customer: {
          firstName: order.first_name || authContext.customer.firstName || 'Customer',
          lastName: order.last_name || authContext.customer.lastName || '',
          email: order.email || authContext.customer.email,
          phone: order.phone || authContext.customer.phone,
        },
        items: formattedItems,
        payment: payment
          ? {
              provider: payment.provider,
              status: payment.status,
              reference: payment.provider_reference,
            }
          : null,
        statusHistory: (statusHistory || []).map((h) => ({
          status: h.to_status,
          previousStatus: h.from_status,
          note: h.note,
          createdAt: h.created_at,
        })),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error fetching order details';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
