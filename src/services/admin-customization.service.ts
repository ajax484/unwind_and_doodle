import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  AdminCustomizationFilterInput,
  AdminCustomizationListResponse,
  AdminCustomizationListItem,
  AdminCustomizationDetail,
  AdminCustomizationAssetItem,
  UploadProcessedAssetInput,
} from '@/types/admin-review-customization';
import { publishDomainEvent } from './events.service';

/**
 * Lists organization custom coloring-book orders with search, status filters, and queue counts.
 */
export async function listAdminCustomizations(
  supabase: SupabaseClient<Database>,
  filters: AdminCustomizationFilterInput & { organizationId: string }
): Promise<AdminCustomizationListResponse> {
  const { organizationId, search, status, productId, page = 1, limit = 25 } = filters;

  // 1. Fetch organization orders
  const { data: orgOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_id')
    .eq('organization_id', organizationId);

  const orgOrderMap = new Map((orgOrders || []).map((o) => [o.id, o]));
  const orgOrderIds = Array.from(orgOrderMap.keys());

  if (orgOrderIds.length === 0) {
    return {
      customizations: [],
      summary: { totalCustomizations: 0, pendingCount: 0, processingCount: 0, completedCount: 0 },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  // 2. Fetch order items for these orders
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, product_name')
    .in('order_id', orgOrderIds);

  const orderItemMap = new Map((orderItems || []).map((i) => [i.id, i]));
  const orderItemIds = Array.from(orderItemMap.keys());

  if (orderItemIds.length === 0) {
    return {
      customizations: [],
      summary: { totalCustomizations: 0, pendingCount: 0, processingCount: 0, completedCount: 0 },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  // 3. Fetch customizations
  const { data: rawCustomizations, error: custErr } = await supabase
    .from('customizations')
    .select('*')
    .in('order_item_id', orderItemIds);

  if (custErr) {
    throw new Error(`Failed to fetch customizations: ${custErr.message}`);
  }

  const allCustomizations = rawCustomizations || [];
  if (allCustomizations.length === 0) {
    return {
      customizations: [],
      summary: { totalCustomizations: 0, pendingCount: 0, processingCount: 0, completedCount: 0 },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  // 4. Fetch customers and customization assets
  const customerIds = Array.from(
    new Set((orgOrders || []).map((o) => o.customer_id).filter(Boolean))
  );
  const customizationIds = allCustomizations.map((c) => c.id);

  const [{ data: customers }, { data: assets }] = await Promise.all([
    customerIds.length > 0
      ? supabase.from('customers').select('id, first_name, last_name, email').in('id', customerIds)
      : Promise.resolve({ data: [] }),
    customizationIds.length > 0
      ? supabase
          .from('customization_assets')
          .select('id, customization_id, processed_storage_path')
          .in('customization_id', customizationIds)
      : Promise.resolve({ data: [] }),
  ]);

  const customerMap = new Map((customers || []).map((c) => [c.id, c]));

  const assetsStatsMap = new Map<string, { total: number; processed: number }>();
  for (const a of assets || []) {
    const cur = assetsStatsMap.get(a.customization_id) || { total: 0, processed: 0 };
    cur.total += 1;
    if (a.processed_storage_path) cur.processed += 1;
    assetsStatsMap.set(a.customization_id, cur);
  }

  // 5. Map list items
  const mappedList: AdminCustomizationListItem[] = allCustomizations.map((c) => {
    const item = orderItemMap.get(c.order_item_id);
    const ord = item ? orgOrderMap.get(item.order_id) : undefined;
    const cust = ord ? customerMap.get(ord.customer_id) : undefined;

    const custName = cust
      ? `${cust.first_name || ''} ${cust.last_name || ''}`.trim() || cust.email
      : 'Guest Customer';

    const assetStats = assetsStatsMap.get(c.id) || { total: 0, processed: 0 };

    return {
      id: c.id,
      orderItemId: c.order_item_id,
      orderId: ord?.id || '',
      orderNumber: ord?.order_number || '',
      orderStatus: ord?.status || 'N/A',
      customerId: cust?.id || '',
      customerName: custName,
      customerEmail: cust?.email || 'N/A',
      productId: item?.product_id || '',
      productName: item?.product_name || 'Custom Coloring Book',
      totalAssetsCount: assetStats.total,
      processedAssetsCount: assetStats.processed,
      status: c.status,
      completedAt: c.completed_at,
      createdAt: c.created_at,
    };
  });

  // 6. Calculate summary counts
  let pendingCount = 0;
  let processingCount = 0;
  let completedCount = 0;

  for (const c of mappedList) {
    if (c.status === 'pending') pendingCount++;
    else if (c.status === 'processing') processingCount++;
    else if (c.status === 'completed') completedCount++;
  }

  // 7. Apply Search & Filters
  let filtered = mappedList;

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        c.orderNumber.toLowerCase().includes(q) ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerEmail.toLowerCase().includes(q) ||
        c.productName.toLowerCase().includes(q)
    );
  }

  if (status && status !== 'all') {
    filtered = filtered.filter((c) => c.status === status);
  }

  if (productId) {
    filtered = filtered.filter((c) => c.productId === productId);
  }

  // Sort: pending & processing first, then newest
  filtered.sort((a, b) => {
    const statusWeight = (s: string) => (s === 'pending' ? 1 : s === 'processing' ? 2 : 3);
    const diff = statusWeight(a.status) - statusWeight(b.status);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // 8. Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    customizations: paginated,
    summary: {
      totalCustomizations: mappedList.length,
      pendingCount,
      processingCount,
      completedCount,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves detailed customization workspace with all uploaded photos, line-art status, and order details.
 */
export async function getAdminCustomizationDetail(
  supabase: SupabaseClient<Database>,
  customizationId: string,
  organizationId: string
): Promise<AdminCustomizationDetail> {
  // 1. Fetch customization
  const { data: customization, error: custErr } = await supabase
    .from('customizations')
    .select('*')
    .eq('id', customizationId)
    .single();

  if (custErr || !customization) {
    throw new Error(`Customization not found: ${customizationId}`);
  }

  // 2. Fetch order item
  const { data: item, error: itemErr } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, product_name, sku')
    .eq('id', customization.order_item_id)
    .single();

  if (itemErr || !item) {
    throw new Error(`Linked order item not found: ${customization.order_item_id}`);
  }

  // 3. Fetch order and verify organization ownership
  const { data: order, error: ordErr } = await supabase
    .from('orders')
    .select('id, order_number, status, customer_id, created_at, organization_id')
    .eq('id', item.order_id)
    .single();

  if (ordErr || !order || order.organization_id !== organizationId) {
    throw new Error('Forbidden: Customization belongs to another organization');
  }

  // 4. Fetch customer and all customization assets
  const [{ data: customer }, { data: assets }] = await Promise.all([
    supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone, whatsapp_number')
      .eq('id', order.customer_id)
      .single(),
    supabase
      .from('customization_assets')
      .select('*')
      .eq('customization_id', customization.id)
      .order('created_at', { ascending: true }),
  ]);

  const customerName = customer
    ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email
    : 'Guest Customer';

  const assetList: AdminCustomizationAssetItem[] = (assets || []).map((a) => ({
    id: a.id,
    customizationId: a.customization_id,
    storagePath: a.storage_path,
    originalFilename: a.original_filename,
    mimeType: a.mime_type,
    fileSize: a.file_size,
    processedStoragePath: a.processed_storage_path,
    originalUrl: a.storage_path.startsWith('http')
      ? a.storage_path
      : `/api/admin/customizations/${customization.id}/assets/${a.id}/original`,
    processedUrl: a.processed_storage_path
      ? a.processed_storage_path.startsWith('http')
        ? a.processed_storage_path
        : `/api/admin/customizations/${customization.id}/assets/${a.id}/processed`
      : null,
    createdAt: a.created_at,
  }));

  const allAssetsProcessed =
    assetList.length > 0 && assetList.every((a) => Boolean(a.processedStoragePath));

  return {
    id: customization.id,
    orderItemId: customization.order_item_id,
    orderId: order.id,
    orderNumber: order.order_number || order.id.substring(0, 8).toUpperCase(),
    orderStatus: order.status,
    orderCreatedAt: order.created_at,
    customerId: customer?.id || order.customer_id,
    customerName,
    customerEmail: customer?.email || 'N/A',
    customerPhone: customer?.phone || null,
    customerWhatsapp: customer?.whatsapp_number || null,
    productId: item.product_id,
    productName: item.product_name,
    productSku: item.sku,
    status: customization.status,
    completedAt: customization.completed_at,
    createdAt: customization.created_at,
    allAssetsProcessed,
    assets: assetList,
  };
}

/**
 * Moves customization status to 'processing'.
 */
export async function startCustomizationProcessing(
  supabase: SupabaseClient<Database>,
  customizationId: string,
  adminUserId: string,
  organizationId: string
) {
  const detail = await getAdminCustomizationDetail(supabase, customizationId, organizationId);

  const { data: updated, error: updateErr } = await supabase
    .from('customizations')
    .update({
      status: 'processing',
    } as Database['public']['Tables']['customizations']['Update'])
    .eq('id', customizationId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to start processing: ${updateErr?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customization.processing_started',
    entity_type: 'customization',
    entity_id: customizationId,
    before_data: { status: detail.status },
    after_data: { status: 'processing' },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  await publishDomainEvent(supabase, {
    eventType: 'customization.processing_started',
    aggregateType: 'customization',
    aggregateId: customizationId,
    payload: {
      customizationId,
      orderId: detail.orderId,
      productId: detail.productId,
      organizationId,
    },
  });

  return updated;
}

/**
 * Attaches a processed line-art file path to a specific customization asset.
 */
export async function setProcessedAsset(
  supabase: SupabaseClient<Database>,
  customizationId: string,
  assetId: string,
  input: UploadProcessedAssetInput,
  adminUserId: string,
  organizationId: string
) {
  const detail = await getAdminCustomizationDetail(supabase, customizationId, organizationId);

  const targetAsset = detail.assets.find((a) => a.id === assetId);
  if (!targetAsset) {
    throw new Error(`Asset not found: ${assetId}`);
  }

  const isReplacement = Boolean(targetAsset.processedStoragePath);

  // 1. Update customization asset
  const { data: updatedAsset, error: assetErr } = await supabase
    .from('customization_assets')
    .update({
      processed_storage_path: input.processedStoragePath.trim(),
    } as Database['public']['Tables']['customization_assets']['Update'])
    .eq('id', assetId)
    .select()
    .single();

  if (assetErr || !updatedAsset) {
    throw new Error(`Failed to update asset processed path: ${assetErr?.message}`);
  }

  // 2. Automatically advance customization to 'processing' if it was 'pending'
  if (detail.status === 'pending') {
    await supabase
      .from('customizations')
      .update({ status: 'processing' } as Database['public']['Tables']['customizations']['Update'])
      .eq('id', customizationId);
  }

  // 3. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: isReplacement ? 'customization.asset_replaced' : 'customization.asset_uploaded',
    entity_type: 'customization_asset',
    entity_id: assetId,
    before_data: { processedStoragePath: targetAsset.processedStoragePath },
    after_data: { processedStoragePath: input.processedStoragePath } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 4. Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'customization.asset_processed',
    aggregateType: 'customization',
    aggregateId: customizationId,
    payload: {
      customizationId,
      assetId,
      isReplacement,
      processedStoragePath: input.processedStoragePath,
      organizationId,
    },
  });

  return updatedAsset;
}

/**
 * Validates that all assets are processed and marks the customization as 'completed'.
 */
export async function completeCustomization(
  supabase: SupabaseClient<Database>,
  customizationId: string,
  adminUserId: string,
  organizationId: string
) {
  const detail = await getAdminCustomizationDetail(supabase, customizationId, organizationId);

  if (detail.assets.length === 0) {
    throw new Error('Cannot complete customization with 0 uploaded assets');
  }

  const missingProcessed = detail.assets.filter((a) => !a.processedStoragePath);
  if (missingProcessed.length > 0) {
    throw new Error(
      `Cannot complete customization. ${missingProcessed.length} of ${detail.assets.length} assets are still missing processed line-art files.`
    );
  }

  const completedAt = new Date().toISOString();

  const { data: updated, error: updateErr } = await supabase
    .from('customizations')
    .update({
      status: 'completed',
      completed_at: completedAt,
    } as Database['public']['Tables']['customizations']['Update'])
    .eq('id', customizationId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to complete customization: ${updateErr?.message}`);
  }

  // Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customization.completed',
    entity_type: 'customization',
    entity_id: customizationId,
    before_data: { status: detail.status, completed_at: detail.completedAt },
    after_data: { status: 'completed', completed_at: completedAt },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'customization.completed',
    aggregateType: 'customization',
    aggregateId: customizationId,
    payload: {
      customizationId,
      orderId: detail.orderId,
      productId: detail.productId,
      completedAt,
      organizationId,
    },
  });

  return updated;
}
