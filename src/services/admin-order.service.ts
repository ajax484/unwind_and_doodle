import { SupabaseClient } from '@supabase/supabase-js';
import { Database, OrderStatus, Json } from '../lib/supabase/types';
import {
  AdminOrderFilters,
  AdminOrderListResponse,
  AdminOrderListItem,
  AdminOrderDetail,
  AdminOrderDetailItem,
  AdminDashboardMetricsResponse,
} from '../types/admin-order';
import { transitionOrderStatus } from './order-state-machine.service';
import { PaystackPaymentProvider } from './payment/paystack.provider';
import { ORDER_STATUS } from '../lib/constants';

/**
 * Lists and filters orders for admin management with search, status filtering, payment filtering, sorting, and pagination.
 */
export async function listAdminOrders(
  supabase: SupabaseClient<Database>,
  filters: AdminOrderFilters
): Promise<AdminOrderListResponse> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 25));
  const offset = (page - 1) * limit;

  // 1. If searching across customer names/email/phone, lookup matching customer IDs
  let matchingCustomerIds: string[] | null = null;
  if (filters.search && filters.search.trim()) {
    const searchVal = filters.search.trim().toLowerCase();
    const { data: matchedCustomers } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name, phone');

    if (matchedCustomers) {
      const filteredCusts = matchedCustomers.filter((c) => {
        const emailMatch = c.email?.toLowerCase().includes(searchVal);
        const firstMatch = c.first_name?.toLowerCase().includes(searchVal);
        const lastMatch = c.last_name?.toLowerCase().includes(searchVal);
        const phoneMatch = c.phone?.toLowerCase().includes(searchVal);
        return emailMatch || firstMatch || lastMatch || phoneMatch;
      });
      matchingCustomerIds = filteredCusts.map((c) => c.id);
    }
  }

  // 2. Fetch orders
  let query = supabase.from('orders').select('*');

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  const { data: allOrders, error: orderError } = await query;

  if (orderError) {
    throw new Error(`Failed to fetch orders: ${orderError.message}`);
  }

  let filtered = allOrders || [];

  // Multi-tenant check if organizationId specified in options
  if (filters.organizationId) {
    filtered = filtered.filter((o) => o.organization_id === filters.organizationId);
  }

  // Status filter
  if (filters.status) {
    filtered = filtered.filter((o) => o.status === filters.status);
  }

  // Warehouse filter
  if (filters.warehouseId) {
    filtered = filtered.filter((o) => o.warehouse_id === filters.warehouseId);
  }

  // Location filter
  if (filters.locationId) {
    filtered = filtered.filter((o) => o.location_id === filters.locationId);
  }

  // Search filter (matches order_number, email, phone, or customer IDs)
  if (filters.search && filters.search.trim()) {
    const searchVal = filters.search.trim().toLowerCase();
    filtered = filtered.filter((o) => {
      const orderNumMatch = o.order_number?.toLowerCase().includes(searchVal);
      const emailMatch = o.email?.toLowerCase().includes(searchVal);
      const phoneMatch = o.phone?.toLowerCase().includes(searchVal);
      const custMatch = matchingCustomerIds && o.customer_id ? matchingCustomerIds.includes(o.customer_id) : false;
      return orderNumMatch || emailMatch || phoneMatch || custMatch;
    });
  }

  // Date filters
  if (filters.startDate) {
    filtered = filtered.filter((o) => o.created_at >= filters.startDate!);
  }
  if (filters.endDate) {
    filtered = filtered.filter((o) => o.created_at <= filters.endDate!);
  }

  // 3. Filter by paymentStatus if requested
  const paymentMap = new Map<string, { status: string; provider: string }>();

  if (filters.paymentStatus) {
    const orderIds = filtered.map((o) => o.id);
    const { data: filterPayments } = orderIds.length > 0
      ? await supabase.from('payments').select('id, order_id, status, provider').in('order_id', orderIds)
      : { data: [] };

    for (const p of filterPayments || []) {
      const existing = paymentMap.get(p.order_id);
      if (!existing || existing.status !== 'successful' || p.status === 'successful') {
        paymentMap.set(p.order_id, { status: p.status, provider: p.provider });
      }
    }

    filtered = filtered.filter((o) => {
      const pay = paymentMap.get(o.id);
      return pay?.status?.toLowerCase() === filters.paymentStatus!.toLowerCase();
    });
  }

  // Sorting
  const sortBy = filters.sortBy || 'newest';
  if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sortBy === 'highest_total') {
    filtered.sort((a, b) => (b.total || 0) - (a.total || 0));
  } else if (sortBy === 'lowest_total') {
    filtered.sort((a, b) => (a.total || 0) - (b.total || 0));
  } else {
    // default: newest
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = filtered.length;
  const paginatedOrders = filtered.slice(offset, offset + limit);

  if (paginatedOrders.length === 0) {
    return {
      orders: [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // 4. Batch fetch related details (customers, warehouses, locations, order_items, payments)
  const paginatedOrderIds = paginatedOrders.map((o) => o.id);
  const customerIds = Array.from(new Set(paginatedOrders.map((o) => o.customer_id).filter(Boolean)));
  const warehouseIds = Array.from(new Set(paginatedOrders.map((o) => o.warehouse_id).filter(Boolean)));
  const locationIds = Array.from(new Set(paginatedOrders.map((o) => o.location_id).filter(Boolean)));
  const validCustomerIds = customerIds.filter((id): id is string => Boolean(id));
  const validWarehouseIds = warehouseIds.filter((id): id is string => Boolean(id));
  const validLocationIds = locationIds.filter((id): id is string => Boolean(id));

  const [
    { data: customers },
    { data: warehouses },
    { data: locations },
    { data: items },
    { data: pagePayments },
  ] = await Promise.all([
    validCustomerIds.length > 0
      ? supabase.from('customers').select('id, email, first_name, last_name, phone').in('id', validCustomerIds)
      : Promise.resolve({ data: [] }),
    validWarehouseIds.length > 0
      ? supabase.from('warehouses').select('*').in('id', validWarehouseIds)
      : Promise.resolve({ data: [] }),
    validLocationIds.length > 0
      ? supabase.from('locations').select('id, name, state').in('id', validLocationIds)
      : Promise.resolve({ data: [] }),
    supabase.from('order_items').select('id, order_id, quantity').in('order_id', paginatedOrderIds),
    !filters.paymentStatus && paginatedOrderIds.length > 0
      ? supabase.from('payments').select('id, order_id, status, provider').in('order_id', paginatedOrderIds)
      : Promise.resolve({ data: [] }),
  ]);

  if (!filters.paymentStatus && pagePayments) {
    for (const p of pagePayments) {
      const existing = paymentMap.get(p.order_id);
      if (!existing || existing.status !== 'successful' || p.status === 'successful') {
        paymentMap.set(p.order_id, { status: p.status, provider: p.provider });
      }
    }
  }

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));
  const warehouseMap = new Map((warehouses || []).map((w) => [w.id, w]));
  const locationMap = new Map((locations || []).map((l) => [l.id, l]));

  const itemCountMap = new Map<string, number>();
  for (const item of items || []) {
    const curr = itemCountMap.get(item.order_id) || 0;
    itemCountMap.set(item.order_id, curr + item.quantity);
  }

  const listItems: AdminOrderListItem[] = paginatedOrders.map((o) => {
    const cust = o.customer_id ? customerMap.get(o.customer_id) : undefined;
    const wh = o.warehouse_id ? warehouseMap.get(o.warehouse_id) : undefined;
    const loc = o.location_id ? locationMap.get(o.location_id) : undefined;
    const pay = paymentMap.get(o.id);

    const displayName =
      o.first_name || o.last_name
        ? `${o.first_name || ''} ${o.last_name || ''}`.trim()
        : cust
        ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim()
        : 'Guest';

    return {
      id: o.id,
      orderNumber: o.order_number,
      status: o.status,
      customer: {
        id: o.customer_id || '',
        email: o.email || cust?.email || '',
        name: displayName || 'Customer',
        phone: o.phone || cust?.phone || null,
      },
      warehouse: {
        id: o.warehouse_id || '',
        name: wh?.name || o.warehouse_id || '',
        code: (wh as Record<string, unknown>)?.code as string || '',
      },
      location: {
        id: o.location_id || '',
        name: loc?.name || o.location_id || '',
        state: loc?.state || '',
      },
      itemCount: itemCountMap.get(o.id) || 0,
      totalAmount: o.total,
      currency: 'NGN',
      paymentStatus: pay?.status || null,
      paymentProvider: pay?.provider || null,
      createdAt: o.created_at,
      updatedAt: o.updated_at,
    };
  });

  return {
    orders: listItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Calculates server-side dashboard metrics and retrieves high-priority pending orders.
 * Only counts paid revenue from valid completed/active orders (pending, confirmed, shipped, received).
 */
export async function getAdminDashboardMetrics(
  supabase: SupabaseClient<Database>,
  organizationId?: string
): Promise<AdminDashboardMetricsResponse> {
  let query = supabase.from('orders').select('*');
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: allOrders, error } = await query;
  if (error) {
    throw new Error(`Failed to calculate dashboard metrics: ${error.message}`);
  }

  const orders = (allOrders || []).filter((o) => !organizationId || o.organization_id === organizationId);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let ordersToday = 0;
  let pendingOrdersCount = 0;
  let revenueToday = 0;
  let revenueThisMonth = 0;

  // Valid revenue states: paid orders that are not cancelled or refunded or created (unpaid)
  const validRevenueStatuses = new Set<string>([
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.SHIPPED,
    ORDER_STATUS.RECEIVED,
  ]);

  for (const o of orders) {
    const createdAt = o.created_at;
    const isToday = createdAt >= startOfToday;
    const isThisMonth = createdAt >= startOfMonth;
    const isValidRevenue = validRevenueStatuses.has(o.status);

    if (isToday) {
      ordersToday++;
      if (isValidRevenue) {
        revenueToday += Number(o.total || 0);
      }
    }

    if (isThisMonth && isValidRevenue) {
      revenueThisMonth += Number(o.total || 0);
    }

    if (o.status === ORDER_STATUS.PENDING) {
      pendingOrdersCount++;
    }
  }

  // Fetch top 5 pending orders and top 5 recent orders
  const [pendingOrdersResponse, recentOrdersResponse] = await Promise.all([
    listAdminOrders(supabase, {
      organizationId,
      status: 'pending',
      page: 1,
      limit: 5,
      sortBy: 'newest',
    }),
    listAdminOrders(supabase, {
      organizationId,
      page: 1,
      limit: 5,
      sortBy: 'newest',
    }),
  ]);

  return {
    ordersToday,
    pendingOrdersCount,
    revenueToday,
    revenueThisMonth,
    currency: 'NGN',
    pendingOrders: pendingOrdersResponse.orders,
    recentOrders: recentOrdersResponse.orders,
  };
}

/**
 * Retrieves full comprehensive order details for admin inspection.
 * Enforces organization isolation if organizationId is supplied.
 */
export async function getAdminOrderDetail(
  supabase: SupabaseClient<Database>,
  orderId: string,
  organizationId?: string
): Promise<AdminOrderDetail> {
  // 1. Fetch main order record
  let query = supabase.from('orders').select('*').eq('id', orderId);
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: order, error: ordErr } = await query.maybeSingle();

  if (ordErr || !order) {
    throw new Error(`Order not found or unauthorized: ${orderId}`);
  }

  if (organizationId && order.organization_id !== organizationId) {
    throw new Error(`Forbidden: Order does not belong to your organization`);
  }

  // 2. Fetch associated entities in parallel
  const [
    { data: customer },
    { data: warehouse },
    { data: location },
    { data: orderItems },
    { data: payments },
    { data: statusHistory },
    { data: reservationsByOrderId },
    { data: reservationsByRefId },
    { data: auditLogs },
    { data: domainEvents },
  ] = await Promise.all([
    supabase.from('customers').select('*').eq('id', order.customer_id || '').maybeSingle(),
    supabase.from('warehouses').select('*').eq('id', order.warehouse_id || '').maybeSingle(),
    supabase.from('locations').select('*').eq('id', order.location_id || '').maybeSingle(),
    supabase.from('order_items').select('*').eq('order_id', orderId),
    supabase.from('payments').select('*').eq('order_id', orderId),
    supabase.from('order_status_history').select('*').eq('order_id', orderId),
    supabase.from('inventory_reservations').select('*').eq('order_id', orderId),
    supabase.from('inventory_reservations').select('*').eq('reference_id' as unknown as 'order_id', orderId),
    supabase.from('audit_logs').select('*').eq('entity_id', orderId),
    supabase.from('domain_events').select('*').eq('aggregate_id', orderId),
  ]);

  const reservations = (reservationsByOrderId && reservationsByOrderId.length > 0)
    ? reservationsByOrderId
    : (reservationsByRefId || []);

  // 3. Fetch product info, add-ons, and customizations for line items
  const itemIds = (orderItems || []).map((i) => i.id);
  const productIds = (orderItems || []).map((i) => i.product_id);
  const legacyCustIds = (orderItems || [])
    .map((i) => (i as Record<string, unknown>).customization_id as string | undefined)
    .filter(Boolean) as string[];

  const [
    { data: products },
    { data: addons },
    { data: custsByItem },
    { data: custsById },
    { data: bundleComps },
  ] = await Promise.all([
    supabase.from('products').select('id, name, sku, product_type').in('id', productIds),
    itemIds.length > 0
      ? supabase.from('order_item_addons').select('*').in('order_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase.from('customizations').select('*').in('order_item_id', itemIds)
      : Promise.resolve({ data: [] }),
    legacyCustIds.length > 0
      ? supabase.from('customizations').select('*').in('id', legacyCustIds)
      : Promise.resolve({ data: [] }),
    itemIds.length > 0
      ? supabase.from('order_item_bundle_components').select('*').in('order_item_id', itemIds)
      : Promise.resolve({ data: [] }),
  ]);

  const allCusts = [...(custsByItem || []), ...(custsById || [])];
  const custIds = allCusts.map((c) => c.id);
  const { data: custAssets } =
    custIds.length > 0
      ? await supabase.from('customization_assets').select('*').in('customization_id', custIds)
      : { data: [] };

  const productMap = new Map((products || []).map((p) => [p.id, p]));
  const custMapByItem = new Map((custsByItem || []).map((c) => [c.order_item_id, c]));
  const custMapById = new Map(allCusts.map((c) => [c.id, c]));

  // Fetch addon product names
  const addonProductIds = (addons || []).map((a) => a.addon_product_id);
  const { data: addonProducts } =
    addonProductIds.length > 0
      ? await supabase.from('products').select('id, name').in('id', addonProductIds)
      : { data: [] };

  const addonProductMap = new Map((addonProducts || []).map((ap) => [ap.id, ap.name]));

  type AddonRow = Database['public']['Tables']['order_item_addons']['Row'];
  type CustAssetRow = Database['public']['Tables']['customization_assets']['Row'];
  type BundleCompRow = Database['public']['Tables']['order_item_bundle_components']['Row'];

  // Map bundle components by order_item_id
  const bundleCompsByItem = new Map<string, { name: string; quantityPerBundle: number; totalQuantity: number }[]>();
  for (const bc of (bundleComps || []) as BundleCompRow[]) {
    if (!bundleCompsByItem.has(bc.order_item_id)) {
      bundleCompsByItem.set(bc.order_item_id, []);
    }
    bundleCompsByItem.get(bc.order_item_id)!.push({
      name: bc.product_name,
      quantityPerBundle: bc.quantity_per_bundle,
      totalQuantity: bc.total_quantity,
    });
  }

  // Fallback for bundle items where order_item_bundle_components was not created
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
        if (prod?.product_type === 'bundle' && (!bundleCompsByItem.has(item.id) || bundleCompsByItem.get(item.id)!.length === 0)) {
          const bis = bItemsByBundle.get(item.product_id) || [];
          const formatted = bis.map((bi) => ({
            name: compNameMap.get(bi.component_product_id) || 'Component Product',
            quantityPerBundle: bi.quantity,
            totalQuantity: item.quantity * bi.quantity,
          }));
          bundleCompsByItem.set(item.id, formatted);
        }
      }
    }
  }

  // Group add-ons by order_item_id
  const addonsByItem = new Map<string, AddonRow[]>();
  for (const addon of (addons || []) as AddonRow[]) {
    if (!addonsByItem.has(addon.order_item_id)) {
      addonsByItem.set(addon.order_item_id, []);
    }
    addonsByItem.get(addon.order_item_id)!.push(addon);
  }

  // Group customization assets by customization_id
  const assetsByCust = new Map<string, CustAssetRow[]>();
  for (const asset of (custAssets || []) as CustAssetRow[]) {
    if (!assetsByCust.has(asset.customization_id)) {
      assetsByCust.set(asset.customization_id, []);
    }
    assetsByCust.get(asset.customization_id)!.push(asset);
  }

  // Fetch theme customization snapshots for order items
  const { data: themeCustRows } = itemIds.length > 0
    ? await supabase.from('order_item_theme_customizations').select('*').in('order_item_id', itemIds)
    : { data: [] };

  const themeCustIds = (themeCustRows || []).map((tc) => tc.id);
  const { data: themeSnapRows } = themeCustIds.length > 0
    ? await supabase.from('order_item_theme_snapshots').select('*').in('customization_id', themeCustIds).order('sort_order', { ascending: true })
    : { data: [] };

  const themeCustByItem = new Map((themeCustRows || []).map((tc) => [tc.order_item_id, tc]));
  const themeSnapsByCust = new Map<string, { themeId: string | null; themeName: string; sortOrder: number }[]>();

  for (const s of themeSnapRows || []) {
    if (!themeSnapsByCust.has(s.customization_id)) {
      themeSnapsByCust.set(s.customization_id, []);
    }
    themeSnapsByCust.get(s.customization_id)!.push({
      themeId: s.theme_id,
      themeName: s.theme_name,
      sortOrder: s.sort_order,
    });
  }

  const detailedItems: AdminOrderDetailItem[] = (orderItems || []).map((item) => {
    const product = productMap.get(item.product_id);
    const itemAddons = addonsByItem.get(item.id) || [];
    const legacyId = (item as Record<string, unknown>).customization_id as string | undefined;
    const cust = custMapByItem.get(item.id) || (legacyId ? custMapById.get(legacyId) : null);
    const assets = cust ? assetsByCust.get(cust.id) || [] : [];
    const themeCustRecord = themeCustByItem.get(item.id);

    return {
      id: item.id,
      productId: item.product_id,
      productName: item.product_name || product?.name || 'Unknown Product',
      sku: item.sku || product?.sku || '',
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total,
      productType: (product?.product_type as 'physical' | 'custom' | 'bundle') || 'physical',
      bundleComponents: bundleCompsByItem.get(item.id) || [],
      customization: cust
        ? {
            id: cust.id,
            notes: ((cust as Record<string, unknown>).notes as string) || null,
            status: cust.status,
            assets: assets.map((a) => ({
              id: a.id,
              assetUrl: ((a as Record<string, unknown>).asset_url as string) || a.storage_path,
              fileType: ((a as Record<string, unknown>).file_type as string) || a.mime_type || 'image/png',
            })),
          }
        : null,
      themeCustomization: themeCustRecord
        ? {
            coverName: themeCustRecord.cover_name,
            themes: themeSnapsByCust.get(themeCustRecord.id) || [],
          }
        : null,
      addons: itemAddons.map((a) => ({
        id: a.id,
        addonProductId: a.addon_product_id,
        addonName: a.product_name || addonProductMap.get(a.addon_product_id) || 'Add-on',
        quantity: a.quantity,
        unitPrice: a.unit_price,
        totalPrice: a.total,
      })),
    };
  });

  // Sort timeline chronologically
  const sortedHistory = [...(statusHistory || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const shippingAddrObj =
    order.shipping_address && typeof order.shipping_address === 'object' && !Array.isArray(order.shipping_address)
      ? (order.shipping_address as { streetAddress?: string; address_line_1?: string; city?: string; state?: string; postalCode?: string })
      : {};

  const successfulPayment = (payments || []).find((p) => p.status === 'successful' || (p.status as string) === 'paid');
  const latestPayment = [...(payments || [])].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const primaryPayment = successfulPayment || latestPayment || null;

  return {
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: (order as any).payment_status === 'successful'
      ? 'successful'
      : (order as any).payment_status === 'failed'
      ? 'failed'
      : primaryPayment?.status || null,
    subtotal: order.subtotal,
    addOnsTotal: 0,
    discountTotal: order.discount_total,
    deliveryFee: order.shipping_fee,
    totalAmount: order.total,
    currency: 'NGN',
    notes: null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    customer: {
      id: order.customer_id || '',
      email: order.email || customer?.email || '',
      firstName: order.first_name || customer?.first_name || '',
      lastName: order.last_name || customer?.last_name || '',
      phone: order.phone || customer?.phone || null,
      marketingConsent: customer?.email_marketing_consent || false,
    },
    shippingAddress: {
      streetAddress: shippingAddrObj.streetAddress || shippingAddrObj.address_line_1 || '',
      city: shippingAddrObj.city || '',
      state: shippingAddrObj.state || '',
      postalCode: shippingAddrObj.postalCode || null,
    },
    warehouse: {
      id: order.warehouse_id || '',
      name: warehouse?.name || order.warehouse_id || '',
      code: '',
      address: null,
    },
    location: {
      id: order.location_id || '',
      name: location?.name || order.location_id || '',
      state: location?.state || '',
      country: 'Nigeria',
    },
    items: detailedItems,
    payments: (payments || []).map((p) => ({
      id: p.id,
      provider: p.provider,
      providerReference: p.provider_reference,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      paidAt: p.paid_at || null,
      metadata: (p.metadata as Json) || null,
      createdAt: p.created_at,
    })),
    statusHistory: sortedHistory.map((h) => ({
      id: h.id,
      status: (h.to_status || (h as Record<string, unknown>).status) as OrderStatus,
      previousStatus: (h.from_status || (h as Record<string, unknown>).previous_status) as OrderStatus,
      note: h.note,
      createdBy: (h.changed_by || (h as Record<string, unknown>).created_by) as string,
      createdAt: h.created_at,
    })),
    reservations: (reservations || []).map((r) => ({
      id: r.id,
      productId: '',
      quantity: r.quantity,
      status: r.status,
      expiresAt: r.expires_at,
    })),
    auditLogs: (auditLogs || []).map((a) => ({
      id: a.id,
      userId: a.actor_id,
      action: a.action,
      oldValues: a.before_data,
      newValues: a.after_data,
      createdAt: a.created_at,
    })),
    domainEvents: (domainEvents || []).map((e) => ({
      id: e.id,
      eventType: e.event_type,
      payload: e.payload,
      createdAt: e.created_at,
    })),
  };
}

export interface RefundAdminOrderParams {
  supabase: SupabaseClient<Database>;
  orderId: string;
  userId?: string | null;
  organizationId?: string | null;
  reason?: string;
  customerNote?: string;
  paystackProvider?: PaystackPaymentProvider;
}

/**
 * Idempotently executes a full refund via Paystack, updates payment record status,
 * transitions order status to 'refunded', records status history, audit logs, and emits domain event.
 */
export async function refundAdminOrder(
  params: RefundAdminOrderParams
) {
  const { supabase, orderId, userId, organizationId, reason, customerNote, paystackProvider } = params;

  // 1. Fetch order
  let orderQuery = supabase.from('orders').select('*').eq('id', orderId);
  if (organizationId) {
    orderQuery = orderQuery.eq('organization_id', organizationId);
  }

  const { data: order, error: orderErr } = await orderQuery.maybeSingle();

  if (orderErr || !order) {
    throw new Error(`Order not found or unauthorized: ${orderId}`);
  }

  if (organizationId && order.organization_id !== organizationId) {
    throw new Error(`Forbidden: Order does not belong to your organization`);
  }

  // Idempotency: Check if already refunded
  if (order.status === ORDER_STATUS.REFUNDED) {
    throw new Error('Order is already refunded');
  }

  // 2. Fetch successful payment record
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId);

  if (payErr || !payments || payments.length === 0) {
    throw new Error('No payment records found for this order');
  }

  const successfulPayment = payments.find(
    (p) => p.status === 'successful' || (p.status as string) === 'paid' || (p.status as string) === 'success'
  ) || payments[0];

  const transactionRef = successfulPayment.provider_reference || (successfulPayment as Record<string, unknown>).reference as string || successfulPayment.id;

  // 3. Execute Paystack provider refund if provider is paystack
  const provider = paystackProvider || new PaystackPaymentProvider();
  try {
    if (provider.refundTransaction && process.env.NODE_ENV !== 'test') {
      await provider.refundTransaction({
        transaction: transactionRef,
        amount: successfulPayment.amount,
        merchantNote: reason || 'Admin initiated full refund',
        customerNote: customerNote || 'Full order refund processed',
      });
    }
  } catch (providerError: unknown) {
    const errorMsg = providerError instanceof Error ? providerError.message : 'Payment provider refund failed';
    throw new Error(`Refund failed: ${errorMsg}`);
  }

  // 4. Update payment record to refunded
  await supabase
    .from('payments')
    .update({
      status: 'refunded',
      updated_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['payments']['Update'])
    .eq('id', successfulPayment.id);

  // 5. Transition order to refunded via order state machine
  const transitionResult = await transitionOrderStatus({
    supabase,
    orderId,
    targetStatus: ORDER_STATUS.REFUNDED,
    userId: userId || null,
    note: reason ? `Refunded: ${reason}` : 'Full refund issued by admin',
    metadata: {
      refundAmount: order.total,
      currency: 'NGN',
      paymentId: successfulPayment.id,
      transactionReference: transactionRef,
    },
  });

  return {
    success: true,
    orderId,
    orderNumber: order.order_number,
    refundAmount: order.total,
    transitionResult,
  };
}
