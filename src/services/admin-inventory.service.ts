import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  AdminInventoryFilterInput,
  AdminInventoryListResponse,
  AdminInventoryItem,
  AdminProductInventoryDetail,
  AdminInventoryMovementItem,
  AdminStockReceiptListItem,
  AdminStockReceiptDetail,
  StockAdjustmentInput,
  CreateStockReceiptInput,
} from '@/types/admin-inventory';
import { publishDomainEvent } from './events.service';
import { generateAutoGrnReference } from '@/lib/sku-helpers';

/**
 * Lists inventory distribution across products and warehouses with search, filters,
 * pagination, and estimated inventory valuation.
 */
export async function listAdminInventory(
  supabase: SupabaseClient<Database>,
  filters: AdminInventoryFilterInput & { organizationId: string }
): Promise<AdminInventoryListResponse> {
  const { organizationId, search, warehouseId, stockStatus, page = 1, limit = 25 } = filters;

  // 1. Fetch organization products
  const { data: orgProducts, error: prodError } = await supabase
    .from('products')
    .select('id, name, slug, sku, product_type, cost_price, selling_price, status')
    .eq('organization_id', organizationId);

  if (prodError) {
    throw new Error(`Failed to fetch products: ${prodError.message}`);
  }

  const validProducts = (orgProducts || []).filter((p) => p.status !== 'archived');
  const productMap = new Map(validProducts.map((p) => [p.id, p]));
  const validProductIds = validProducts.map((p) => p.id);

  if (validProductIds.length === 0) {
    return {
      inventory: [],
      summary: {
        totalProductsTracked: 0,
        outOfStockCount: 0,
        totalReservedUnits: 0,
        estimatedInventoryValue: 0,
      },
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  // 2. Fetch organization warehouses
  const { data: orgWarehouses, error: whError } = await supabase
    .from('warehouses')
    .select('id, name, active')
    .eq('organization_id', organizationId);

  if (whError) {
    throw new Error(`Failed to fetch warehouses: ${whError.message}`);
  }

  const warehouseMap = new Map((orgWarehouses || []).map((w) => [w.id, w.name]));
  const validWarehouseIds = (orgWarehouses || []).map((w) => w.id);

  // 3. Fetch product primary images
  const { data: images } = await supabase
    .from('product_images')
    .select('product_id, storage_path, sort_order')
    .in('product_id', validProductIds)
    .order('sort_order', { ascending: true });

  const primaryImageMap = new Map<string, string>();
  for (const img of images || []) {
    if (!primaryImageMap.has(img.product_id)) {
      primaryImageMap.set(img.product_id, img.storage_path);
    }
  }

  // 4. Fetch all inventory rows for organization products & warehouses
  let invQuery = supabase
    .from('inventory')
    .select('*')
    .in('product_id', validProductIds);

  if (validWarehouseIds.length > 0) {
    invQuery = invQuery.in('warehouse_id', validWarehouseIds);
  }

  const { data: rawInventory, error: invError } = await invQuery;
  if (invError) {
    throw new Error(`Failed to query inventory: ${invError.message}`);
  }

  // 5. Combine and calculate available stock
  const allInventoryItems: AdminInventoryItem[] = [];

  for (const inv of rawInventory || []) {
    const product = productMap.get(inv.product_id);
    if (!product) continue;

    const warehouseName = warehouseMap.get(inv.warehouse_id) || 'Unknown Warehouse';
    const quantityOnHand = inv.quantity ?? (inv as Record<string, unknown>).quantity_on_hand as number ?? 0;
    const quantityReserved = inv.reserved_quantity ?? (inv as Record<string, unknown>).quantity_reserved as number ?? 0;
    const availableToSell = Math.max(0, quantityOnHand - quantityReserved);

    allInventoryItems.push({
      id: inv.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sku: product.sku,
      productType: product.product_type,
      primaryImage: primaryImageMap.get(product.id) || null,
      costPrice: product.cost_price || 0,
      sellingPrice: product.selling_price || 0,
      warehouseId: inv.warehouse_id,
      warehouseName,
      quantityOnHand,
      quantityReserved,
      availableToSell,
      updatedAt: inv.updated_at,
    });
  }

  // Calculate virtual stock for bundle products across warehouses
  const bundleProducts = validProducts.filter((p) => p.product_type === 'bundle');
  let bundleItems: Database['public']['Tables']['bundle_items']['Row'][] = [];
  if (bundleProducts.length > 0) {
    try {
      const { data: bItems } = await supabase
        .from('bundle_items')
        .select('*')
        .in(
          'bundle_product_id',
          bundleProducts.map((b) => b.id)
        );
      bundleItems = bItems || [];
    } catch {
      // Non-blocking
    }
  }

  const bundleItemsByBundle = new Map<string, typeof bundleItems>();
  for (const bi of bundleItems) {
    const list = bundleItemsByBundle.get(bi.bundle_product_id) || [];
    list.push(bi);
    bundleItemsByBundle.set(bi.bundle_product_id, list);
  }

  const componentStockByWhAndProd = new Map<
    string,
    Map<string, { onHand: number; reserved: number; available: number }>
  >();

  for (const item of allInventoryItems) {
    let whMap = componentStockByWhAndProd.get(item.warehouseId);
    if (!whMap) {
      whMap = new Map();
      componentStockByWhAndProd.set(item.warehouseId, whMap);
    }
    whMap.set(item.productId, {
      onHand: item.quantityOnHand,
      reserved: item.quantityReserved,
      available: item.availableToSell,
    });
  }

  const primaryWarehouseId = validWarehouseIds[0] || 'default';
  const primaryWarehouseName = warehouseMap.get(primaryWarehouseId) || 'Main Warehouse';

  for (const bundle of bundleProducts) {
    const items = bundleItemsByBundle.get(bundle.id) || [];
    const activeWarehouses =
      validWarehouseIds.length > 0 ? validWarehouseIds : [primaryWarehouseId];

    for (const whId of activeWarehouses) {
      const whName = warehouseMap.get(whId) || primaryWarehouseName;
      const whStockMap = componentStockByWhAndProd.get(whId) || new Map();

      if (items.length === 0) {
        allInventoryItems.push({
          id: `virtual-${bundle.id}-${whId}`,
          productId: bundle.id,
          productName: bundle.name,
          productSlug: bundle.slug,
          sku: bundle.sku,
          productType: 'bundle',
          primaryImage: primaryImageMap.get(bundle.id) || null,
          costPrice: bundle.cost_price || 0,
          sellingPrice: bundle.selling_price || 0,
          warehouseId: whId,
          warehouseName: whName,
          quantityOnHand: 0,
          quantityReserved: 0,
          availableToSell: 0,
          updatedAt: new Date().toISOString(),
        });
      } else {
        let minOnHand = Infinity;
        let minAvailable = Infinity;
        let maxReserved = 0;

        for (const item of items) {
          const compStock = whStockMap.get(item.component_product_id) || {
            onHand: 0,
            reserved: 0,
            available: 0,
          };
          const qtyPerBundle = Math.max(1, item.quantity || 1);

          const possibleOnHand = Math.floor(compStock.onHand / qtyPerBundle);
          const possibleAvailable = Math.floor(compStock.available / qtyPerBundle);
          const possibleReserved = Math.ceil(compStock.reserved / qtyPerBundle);

          if (possibleOnHand < minOnHand) minOnHand = possibleOnHand;
          if (possibleAvailable < minAvailable) minAvailable = possibleAvailable;
          if (possibleReserved > maxReserved) maxReserved = possibleReserved;
        }

        allInventoryItems.push({
          id: `virtual-${bundle.id}-${whId}`,
          productId: bundle.id,
          productName: bundle.name,
          productSlug: bundle.slug,
          sku: bundle.sku,
          productType: 'bundle',
          primaryImage: primaryImageMap.get(bundle.id) || null,
          costPrice: bundle.cost_price || 0,
          sellingPrice: bundle.selling_price || 0,
          warehouseId: whId,
          warehouseName: whName,
          quantityOnHand: isFinite(minOnHand) ? Math.max(0, minOnHand) : 0,
          quantityReserved: maxReserved,
          availableToSell: isFinite(minAvailable) ? Math.max(0, minAvailable) : 0,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // Synthesize 0-stock records for physical/custom products not tracked in inventory
  const trackedProductIdsInInventory = new Set(allInventoryItems.map((i) => i.productId));
  for (const prod of validProducts) {
    if (prod.product_type !== 'bundle' && !trackedProductIdsInInventory.has(prod.id)) {
      allInventoryItems.push({
        id: `synth-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        productSlug: prod.slug,
        sku: prod.sku,
        productType: prod.product_type,
        primaryImage: primaryImageMap.get(prod.id) || null,
        costPrice: prod.cost_price || 0,
        sellingPrice: prod.selling_price || 0,
        warehouseId: primaryWarehouseId,
        warehouseName: primaryWarehouseName,
        quantityOnHand: 0,
        quantityReserved: 0,
        availableToSell: 0,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 6. Calculate Global Summary Metrics
  const totalProductsTracked = validProducts.length;
  let outOfStockCount = 0;
  let totalReservedUnits = 0;
  let estimatedInventoryValue = 0;

  // Group by product to check total product available stock
  const productStockAggregation = new Map<string, number>();
  for (const item of allInventoryItems) {
    const cur = productStockAggregation.get(item.productId) || 0;
    productStockAggregation.set(item.productId, cur + item.availableToSell);
    totalReservedUnits += item.quantityReserved;
    estimatedInventoryValue += item.quantityOnHand * item.costPrice;
  }

  for (const prod of validProducts) {
    const totalAvail = productStockAggregation.get(prod.id) || 0;
    if (totalAvail <= 0) {
      outOfStockCount++;
    }
  }

  // 7. Apply Filters
  let filtered = allInventoryItems;

  if (warehouseId && warehouseId !== 'all') {
    filtered = filtered.filter((i) => i.warehouseId === warehouseId);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        (i.sku && i.sku.toLowerCase().includes(q))
    );
  }

  if (stockStatus && stockStatus !== 'all') {
    if (stockStatus === 'in_stock') {
      filtered = filtered.filter((i) => i.availableToSell > 0);
    } else if (stockStatus === 'out_of_stock') {
      filtered = filtered.filter((i) => i.availableToSell <= 0);
    }
  }

  // Sort by product name A-Z, then warehouse name
  filtered.sort((a, b) => a.productName.localeCompare(b.productName));

  // 8. Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    inventory: paginated,
    summary: {
      totalProductsTracked,
      outOfStockCount,
      totalReservedUnits,
      estimatedInventoryValue,
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
 * Retrieves multi-warehouse inventory breakdown and complete movement history
 * for a specific product.
 */
export async function getProductInventoryDetails(
  supabase: SupabaseClient<Database>,
  productId: string,
  organizationId: string
): Promise<AdminProductInventoryDetail> {
  // 1. Verify product
  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('id, organization_id, name, slug, sku, cost_price, selling_price')
    .eq('id', productId)
    .single();

  if (prodError || !product) {
    throw new Error(`Product not found: ${productId}`);
  }

  if (product.organization_id !== organizationId) {
    throw new Error('Forbidden: Product belongs to another organization');
  }

  // 2. Fetch primary image
  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })
    .limit(1);

  const primaryImage = images && images.length > 0 ? images[0].storage_path : null;

  // 3. Fetch warehouses
  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name, state')
    .eq('organization_id', organizationId);

  const warehouseMap = new Map((warehouses || []).map((w) => [w.id, w]));

  // 4. Fetch inventory rows
  const { data: invRows } = await supabase
    .from('inventory')
    .select('*')
    .eq('product_id', productId);

  const warehouseDistributions = (warehouses || []).map((wh) => {
    const inv = (invRows || []).find((i) => i.warehouse_id === wh.id);
    const quantityOnHand = inv ? (inv.quantity ?? (inv as Record<string, unknown>).quantity_on_hand as number ?? 0) : 0;
    const quantityReserved = inv ? (inv.reserved_quantity ?? (inv as Record<string, unknown>).quantity_reserved as number ?? 0) : 0;
    const availableToSell = Math.max(0, quantityOnHand - quantityReserved);

    return {
      warehouseId: wh.id,
      warehouseName: wh.name,
      warehouseState: wh.state,
      quantityOnHand,
      quantityReserved,
      availableToSell,
      updatedAt: inv?.updated_at || new Date().toISOString(),
    };
  });

  const totalStockOnHand = warehouseDistributions.reduce((sum, w) => sum + w.quantityOnHand, 0);
  const totalStockReserved = warehouseDistributions.reduce((sum, w) => sum + w.quantityReserved, 0);
  const totalAvailableToSell = Math.max(0, totalStockOnHand - totalStockReserved);

  // 5. Fetch inventory movements
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  const movementItems: AdminInventoryMovementItem[] = (movements || []).map((m) => ({
    id: m.id,
    movementType: m.movement_type,
    quantity: m.quantity,
    warehouseId: m.warehouse_id,
    warehouseName: warehouseMap.get(m.warehouse_id)?.name || 'Warehouse',
    referenceId: m.reference_id,
    note: m.note,
    createdAt: m.created_at,
  }));

  return {
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    sku: product.sku,
    costPrice: product.cost_price || 0,
    sellingPrice: product.selling_price || 0,
    primaryImage,
    totalStockOnHand,
    totalStockReserved,
    totalAvailableToSell,
    warehouses: warehouseDistributions,
    movements: movementItems,
  };
}

/**
 * Atomically adjusts stock quantity for a product in a warehouse.
 * Validates resulting quantity is non-negative and creates an inventory movement record.
 */
export async function adjustInventoryStock(
  supabase: SupabaseClient<Database>,
  input: StockAdjustmentInput,
  adminUserId: string,
  organizationId: string
): Promise<{ success: boolean; newQuantity: number; availableToSell: number }> {
  const { warehouse_id, product_id, adjustment_quantity, reason, note } = input;

  // 1. Verify organization ownership of product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, organization_id, name')
    .eq('id', product_id)
    .single();

  if (prodErr || !product || product.organization_id !== organizationId) {
    throw new Error('Forbidden: Product not found or belongs to another organization');
  }

  // 2. Verify organization ownership of warehouse
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id, name')
    .eq('id', warehouse_id)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  // 3. Find or initialize inventory record
  const { data: existingInv } = await supabase
    .from('inventory')
    .select('*')
    .eq('warehouse_id', warehouse_id)
    .eq('product_id', product_id)
    .maybeSingle();

  const currentQuantity = existingInv
    ? (existingInv.quantity ?? (existingInv as Record<string, unknown>).quantity_on_hand as number ?? 0)
    : 0;
  const currentReserved = existingInv
    ? (existingInv.reserved_quantity ?? (existingInv as Record<string, unknown>).quantity_reserved as number ?? 0)
    : 0;

  const newQuantity = currentQuantity + adjustment_quantity;

  if (newQuantity < 0) {
    throw new Error(
      `Stock adjustment rejected: Resulting quantity cannot be negative (Current: ${currentQuantity}, Adjustment: ${adjustment_quantity})`
    );
  }

  const availableToSell = Math.max(0, newQuantity - currentReserved);

  // 4. Update or insert inventory row
  if (existingInv) {
    const { error: updateErr } = await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['inventory']['Update'])
      .eq('id', existingInv.id);

    if (updateErr) {
      throw new Error(`Failed to update inventory: ${updateErr.message}`);
    }
  } else {
    const { error: insertErr } = await supabase
      .from('inventory')
      .insert({
        warehouse_id,
        product_id,
        quantity: newQuantity,
        reserved_quantity: 0,
        updated_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['inventory']['Insert']);

    if (insertErr) {
      throw new Error(`Failed to initialize inventory: ${insertErr.message}`);
    }
  }

  // 5. Create inventory movement record
  const combinedNote = note ? `${reason}: ${note}` : reason;
  await supabase.from('inventory_movements').insert({
    warehouse_id,
    product_id,
    quantity: adjustment_quantity,
    movement_type: 'adjustment',
    reference_id: null,
    note: combinedNote,
  } as unknown as Database['public']['Tables']['inventory_movements']['Insert']);

  // 6. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'stock.adjusted',
    entity_type: 'inventory',
    entity_id: `${warehouse_id}:${product_id}`,
    before_data: { quantity: currentQuantity, reserved: currentReserved },
    after_data: {
      quantity: newQuantity,
      adjustment: adjustment_quantity,
      reason,
      note,
    } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'inventory.adjusted',
    aggregateType: 'inventory',
    aggregateId: `${warehouse_id}:${product_id}`,
    payload: {
      warehouseId: warehouse_id,
      productId: product_id,
      previousQuantity: currentQuantity,
      adjustment: adjustment_quantity,
      newQuantity,
      availableToSell,
      reason,
      adjustedBy: adminUserId,
      organizationId,
    },
  });

  return {
    success: true,
    newQuantity,
    availableToSell,
  };
}

/**
 * Creates and finalizes a Goods Received Note (Stock Receipt) atomically.
 * Increases inventory on hand, creates 'purchase' movement records, and guarantees
 * idempotency on receipt reference.
 */
export async function createStockReceipt(
  supabase: SupabaseClient<Database>,
  input: CreateStockReceiptInput,
  adminUserId: string,
  organizationId: string
): Promise<AdminStockReceiptDetail> {
  const { warehouse_id, reference, notes, received_at, items } = input;

  // 1. Verify warehouse belongs to organization
  const { data: warehouse, error: whErr } = await supabase
    .from('warehouses')
    .select('id, organization_id, name')
    .eq('id', warehouse_id)
    .single();

  if (whErr || !warehouse || warehouse.organization_id !== organizationId) {
    throw new Error('Forbidden: Warehouse not found or belongs to another organization');
  }

  // 2. Resolve & validate receipt reference (auto-generate if omitted)
  let resolvedRef = reference && reference.trim() ? reference.trim() : generateAutoGrnReference();

  let attempts = 0;
  while (attempts < 5) {
    const { data: existingRef } = await supabase
      .from('stock_receipts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('reference', resolvedRef);

    if (!existingRef || existingRef.length === 0) {
      break;
    }

    if (reference && reference.trim()) {
      throw new Error(`A stock receipt with reference "${reference}" already exists.`);
    }

    resolvedRef = generateAutoGrnReference();
    attempts++;
  }

  // 3. Verify all product items belong to organization
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id, organization_id, name, sku')
    .in('id', productIds);

  if (prodErr || !products || products.length !== productIds.length) {
    throw new Error('One or more product items are invalid or missing');
  }

  for (const p of products) {
    if (p.organization_id !== organizationId) {
      throw new Error(`Product ${p.name} belongs to another organization`);
    }
  }

  const prodMap = new Map(products.map((p) => [p.id, p]));

  // 4. Create stock_receipts record
  const receiptTimestamp = received_at || new Date().toISOString();
  const { data: receiptRow, error: receiptErr } = await supabase
    .from('stock_receipts')
    .insert({
      organization_id: organizationId,
      warehouse_id,
      reference: resolvedRef,
      notes: notes || null,
      received_at: receiptTimestamp,
    } as unknown as Database['public']['Tables']['stock_receipts']['Insert'])
    .select()
    .single();

  if (receiptErr || !receiptRow) {
    throw new Error(`Failed to create stock receipt: ${receiptErr?.message}`);
  }

  const receiptId = receiptRow.id;

  // 5. Insert receipt items and update inventory
  const receiptItemsDetail = [];
  let totalUnitsReceived = 0;
  let totalReceiptCost = 0;

  for (const item of items) {
    const prod = prodMap.get(item.product_id)!;
    const lineTotal = item.quantity * item.cost_price;
    totalUnitsReceived += item.quantity;
    totalReceiptCost += lineTotal;

    // Insert stock_receipt_items
    const { data: insertedItem } = await supabase
      .from('stock_receipt_items')
      .insert({
        stock_receipt_id: receiptId,
        product_id: item.product_id,
        quantity: item.quantity,
        cost_price: item.cost_price,
      } as unknown as Database['public']['Tables']['stock_receipt_items']['Insert'])
      .select()
      .single();

    // Increment inventory on hand
    const { data: existingInv } = await supabase
      .from('inventory')
      .select('*')
      .eq('warehouse_id', warehouse_id)
      .eq('product_id', item.product_id)
      .maybeSingle();

    if (existingInv) {
      const curQty = existingInv.quantity ?? (existingInv as Record<string, unknown>).quantity_on_hand as number ?? 0;
      await supabase
        .from('inventory')
        .update({
          quantity: curQty + item.quantity,
          updated_at: new Date().toISOString(),
        } as unknown as Database['public']['Tables']['inventory']['Update'])
        .eq('id', existingInv.id);
    } else {
      await supabase.from('inventory').insert({
        warehouse_id,
        product_id: item.product_id,
        quantity: item.quantity,
        reserved_quantity: 0,
        updated_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['inventory']['Insert']);
    }

    // Insert inventory movement
    await supabase.from('inventory_movements').insert({
      warehouse_id,
      product_id: item.product_id,
      quantity: item.quantity,
      movement_type: 'purchase',
      reference_id: receiptId,
      note: `Stock Receipt: ${reference}`,
    } as unknown as Database['public']['Tables']['inventory_movements']['Insert']);

    receiptItemsDetail.push({
      id: insertedItem?.id || `item-${item.product_id}`,
      productId: item.product_id,
      productName: prod.name,
      productSku: prod.sku,
      quantity: item.quantity,
      costPrice: item.cost_price,
      lineTotal,
    });
  }

  // 6. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'stock.received',
    entity_type: 'stock_receipt',
    entity_id: receiptId,
    before_data: null,
    after_data: {
      reference,
      warehouse_id,
      itemsCount: items.length,
      totalUnitsReceived,
      totalReceiptCost,
    } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'inventory.stock_received',
    aggregateType: 'stock_receipt',
    aggregateId: receiptId,
    payload: {
      receiptId,
      reference,
      warehouseId: warehouse_id,
      totalUnitsReceived,
      totalReceiptCost,
      organizationId,
      receivedBy: adminUserId,
    },
  });

  return {
    id: receiptId,
    reference: receiptRow.reference,
    warehouseId: receiptRow.warehouse_id,
    warehouseName: warehouse.name,
    notes: receiptRow.notes,
    receivedAt: receiptRow.received_at,
    createdAt: receiptRow.created_at,
    totalItemsCount: items.length,
    totalUnitsReceived,
    totalReceiptCost,
    items: receiptItemsDetail,
  };
}

/**
 * Lists historical stock receipts for an organization.
 */
export async function listStockReceipts(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<AdminStockReceiptListItem[]> {
  const { data: receipts, error } = await supabase
    .from('stock_receipts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('received_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to list stock receipts: ${error.message}`);
  }

  const { data: warehouses } = await supabase
    .from('warehouses')
    .select('id, name')
    .eq('organization_id', organizationId);

  const whMap = new Map((warehouses || []).map((w) => [w.id, w.name]));

  const { data: allItems } = await supabase
    .from('stock_receipt_items')
    .select('stock_receipt_id, quantity, cost_price');

  const itemsByReceipt = new Map<string, { totalUnits: number; totalCost: number; count: number }>();
  for (const item of allItems || []) {
    const cur = itemsByReceipt.get(item.stock_receipt_id) || { totalUnits: 0, totalCost: 0, count: 0 };
    cur.totalUnits += item.quantity;
    cur.totalCost += item.quantity * item.cost_price;
    cur.count += 1;
    itemsByReceipt.set(item.stock_receipt_id, cur);
  }

  return (receipts || []).map((r) => {
    const stats = itemsByReceipt.get(r.id) || { totalUnits: 0, totalCost: 0, count: 0 };
    return {
      id: r.id,
      reference: r.reference,
      warehouseId: r.warehouse_id,
      warehouseName: whMap.get(r.warehouse_id) || 'Warehouse',
      notes: r.notes,
      receivedAt: r.received_at,
      createdAt: r.created_at,
      totalItemsCount: stats.count,
      totalUnitsReceived: stats.totalUnits,
      totalReceiptCost: stats.totalCost,
    };
  });
}
