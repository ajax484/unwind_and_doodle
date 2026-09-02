import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../lib/supabase/types';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductAddonInput,
  UpdateProductAddonInput,
  AdminProductFilters,
  AdminProductListResponse,
  AdminProductListItem,
  AdminProductDetail,
  AdminProductAddonDetail,
  AdminProductCategoryItem,
} from '../types/admin-product';
import { publishDomainEvent } from './events.service';
import { generateAutoSku } from '../lib/sku-helpers';

/**
 * Utility to generate a URL-safe slug from a string.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Ensures slug is unique within an organization by checking existing products and appending numbers if needed.
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient<Database>,
  name: string,
  organizationId: string,
  existingProductId?: string
): Promise<string> {
  const baseSlug = slugify(name) || 'product';
  let candidateSlug = baseSlug;
  let counter = 1;

  while (true) {
    const { data: matched } = await supabase
      .from('products')
      .select('id, slug')
      .eq('organization_id', organizationId)
      .eq('slug', candidateSlug);

    const conflicting = (matched || []).filter((p) => !existingProductId || p.id !== existingProductId);
    if (conflicting.length === 0) {
      return candidateSlug;
    }
    candidateSlug = `${baseSlug}-${counter}`;
    counter++;
  }
}

/**
 * Lists products with search, status, type, category filtering, sorting, and pagination for admin catalog management.
 */
export async function listAdminProducts(
  supabase: SupabaseClient<Database>,
  filters: AdminProductFilters
): Promise<AdminProductListResponse> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 25));
  const offset = (page - 1) * limit;

  // 1. If filtering by categoryId, get matching product IDs
  let categoryProductIds: string[] | null = null;
  if (filters.categoryId) {
    const { data: matchedProductCats } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', filters.categoryId);

    categoryProductIds = (matchedProductCats || []).map((pc) => pc.product_id);
  }

  // 2. Fetch products
  let query = supabase.from('products').select('*');
  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  const { data: allProducts, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch admin products: ${error.message}`);
  }

  let filtered = (allProducts || []).filter(
    (p) => !filters.organizationId || p.organization_id === filters.organizationId
  );

  // Status filter
  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  // Product type filter
  if (filters.product_type) {
    filtered = filtered.filter((p) => p.product_type === filters.product_type);
  }

  // Category filter
  if (categoryProductIds !== null) {
    filtered = filtered.filter((p) => categoryProductIds!.includes(p.id));
  }

  // Search filter (matches name or SKU)
  if (filters.search && filters.search.trim()) {
    const searchVal = filters.search.trim().toLowerCase();
    filtered = filtered.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(searchVal);
      const skuMatch = p.sku?.toLowerCase().includes(searchVal);
      return nameMatch || skuMatch;
    });
  }

  // Sorting
  const sortBy = filters.sortBy || 'newest';
  if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else if (sortBy === 'price_asc') {
    filtered.sort((a, b) => (a.selling_price || 0) - (b.selling_price || 0));
  } else if (sortBy === 'price_desc') {
    filtered.sort((a, b) => (b.selling_price || 0) - (a.selling_price || 0));
  } else if (sortBy === 'name_asc') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // default: newest
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  if (paginated.length === 0) {
    return {
      products: [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // 3. Batch fetch related details (images, categories, inventory)
  const productIds = paginated.map((p) => p.id);
  const bundleProductIds = paginated.filter((p) => p.product_type === 'bundle').map((p) => p.id);

  let bundleItems: Database['public']['Tables']['bundle_items']['Row'][] = [];
  if (bundleProductIds.length > 0) {
    try {
      const { data: bItems } = await supabase
        .from('bundle_items')
        .select('*')
        .in('bundle_product_id', bundleProductIds);
      bundleItems = bItems || [];
    } catch {
      // Non-blocking
    }
  }

  const componentProductIds = [...new Set(bundleItems.map((bi) => bi.component_product_id))];
  const allInventoryProductIds = [...new Set([...productIds, ...componentProductIds])];

  let images: Database['public']['Tables']['product_images']['Row'][] = [];
  let prodCats: Database['public']['Tables']['product_categories']['Row'][] = [];
  let allCats: Database['public']['Tables']['categories']['Row'][] = [];
  let inventory: Database['public']['Tables']['inventory']['Row'][] = [];

  try {
    const results = await Promise.allSettled([
      supabase.from('product_images').select('*').in('product_id', productIds),
      supabase.from('product_categories').select('*').in('product_id', productIds),
      filters.organizationId
        ? supabase.from('categories').select('*').eq('organization_id', filters.organizationId)
        : supabase.from('categories').select('*'),
      supabase.from('inventory').select('*').in('product_id', allInventoryProductIds),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value?.data) {
      images = results[0].value.data as unknown as Database['public']['Tables']['product_images']['Row'][];
    }
    if (results[1].status === 'fulfilled' && results[1].value?.data) {
      prodCats = results[1].value.data as unknown as Database['public']['Tables']['product_categories']['Row'][];
    }
    if (results[2].status === 'fulfilled' && results[2].value?.data) {
      allCats = results[2].value.data as unknown as Database['public']['Tables']['categories']['Row'][];
    }
    if (results[3].status === 'fulfilled' && results[3].value?.data) {
      inventory = results[3].value.data as unknown as Database['public']['Tables']['inventory']['Row'][];
    }
  } catch (err) {
    console.warn('[listAdminProducts] Non-blocking relation fetch error:', err);
  }

  const categoryMap = new Map((allCats || []).map((c) => [c.id, c]));

  // Primary image per product (lowest sort_order)
  const primaryImageMap = new Map<string, string>();
  const sortedImages = [...(images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  for (const img of sortedImages) {
    if (!primaryImageMap.has(img.product_id)) {
      primaryImageMap.set(img.product_id, img.storage_path);
    }
  }

  // Categories per product
  const categoriesByProduct = new Map<string, AdminProductCategoryItem[]>();
  for (const pc of prodCats || []) {
    const cat = categoryMap.get(pc.category_id);
    if (cat) {
      if (!categoriesByProduct.has(pc.product_id)) {
        categoriesByProduct.set(pc.product_id, []);
      }
      categoriesByProduct.get(pc.product_id)!.push({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      });
    }
  }

  // Inventory aggregates per product
  const stockMap = new Map<string, { onHand: number; reserved: number; available: number }>();
  for (const inv of inventory || []) {
    const curr = stockMap.get(inv.product_id) || { onHand: 0, reserved: 0, available: 0 };
    const invExt = inv as typeof inv & { quantity_on_hand?: number; quantity_reserved?: number };
    const onHand = Number(invExt.quantity_on_hand ?? inv.quantity ?? 0);
    const reserved = Number(invExt.quantity_reserved ?? inv.reserved_quantity ?? 0);
    curr.onHand += onHand;
    curr.reserved += reserved;
    curr.available += Math.max(0, onHand - reserved);
    stockMap.set(inv.product_id, curr);
  }

  // Calculate virtual stock for bundle products based on component inventory
  const bundleItemsByBundle = new Map<string, typeof bundleItems>();
  for (const bi of bundleItems) {
    const list = bundleItemsByBundle.get(bi.bundle_product_id) || [];
    list.push(bi);
    bundleItemsByBundle.set(bi.bundle_product_id, list);
  }

  for (const bundleId of bundleProductIds) {
    const items = bundleItemsByBundle.get(bundleId) || [];
    if (items.length === 0) {
      stockMap.set(bundleId, { onHand: 0, reserved: 0, available: 0 });
    } else {
      let minOnHand = Infinity;
      let minAvailable = Infinity;
      let maxReserved = 0;

      for (const item of items) {
        const compStock = stockMap.get(item.component_product_id) || { onHand: 0, reserved: 0, available: 0 };
        const qtyPerBundle = Math.max(1, item.quantity || 1);

        const possibleOnHand = Math.floor(compStock.onHand / qtyPerBundle);
        const possibleAvailable = Math.floor(compStock.available / qtyPerBundle);
        const possibleReserved = Math.ceil(compStock.reserved / qtyPerBundle);

        if (possibleOnHand < minOnHand) minOnHand = possibleOnHand;
        if (possibleAvailable < minAvailable) minAvailable = possibleAvailable;
        if (possibleReserved > maxReserved) maxReserved = possibleReserved;
      }

      stockMap.set(bundleId, {
        onHand: isFinite(minOnHand) ? Math.max(0, minOnHand) : 0,
        reserved: maxReserved,
        available: isFinite(minAvailable) ? Math.max(0, minAvailable) : 0,
      });
    }
  }

  const listItems: AdminProductListItem[] = paginated.map((p) => {
    const stock = stockMap.get(p.id) || { onHand: 0, reserved: 0, available: 0 };
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku || null,
      product_type: p.product_type,
      selling_price: p.selling_price,
      cost_price: p.cost_price || 0,
      status: p.status,
      requires_customization: p.requires_customization || false,
      primaryImage: primaryImageMap.get(p.id) || null,
      categories: categoriesByProduct.get(p.id) || [],
      totalStock: stock.onHand,
      reservedStock: stock.reserved,
      availableStock: stock.available,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    };
  });

  return {
    products: listItems,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves comprehensive product detail including images, categories, add-on relationships, and warehouse inventory.
 */
export async function getAdminProductDetail(
  supabase: SupabaseClient<Database>,
  productId: string,
  organizationId?: string
): Promise<AdminProductDetail> {
  // 1. Fetch product
  let query = supabase.from('products').select('*').eq('id', productId);
  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: product, error } = await query.maybeSingle();

  if (error || !product) {
    throw new Error(`Product not found or unauthorized: ${productId}`);
  }

  if (organizationId && product.organization_id !== organizationId) {
    throw new Error(`Forbidden: Product does not belong to your organization`);
  }

  // 2. Fetch images, categories, add-ons, inventory, and warehouses in parallel
  const [
    { data: images },
    { data: prodCats },
    { data: allCats },
    { data: addons },
    { data: inventory },
    { data: warehouses },
  ] = await Promise.all([
    supabase.from('product_images').select('*').eq('product_id', productId),
    supabase.from('product_categories').select('*').eq('product_id', productId),
    supabase.from('categories').select('*'),
    supabase.from('product_addons').select('*').eq('parent_product_id', productId),
    supabase.from('inventory').select('*').eq('product_id', productId),
    supabase.from('warehouses').select('*'),
  ]);

  // Sort images by sort_order
  const sortedImages = [...(images || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  // Resolve categories
  const categoryMap = new Map((allCats || []).map((c) => [c.id, c]));
  const resolvedCats: AdminProductCategoryItem[] = (prodCats || [])
    .map((pc) => categoryMap.get(pc.category_id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, name: c.name, slug: c.slug }));

  // Resolve add-ons with product details and images
  const addonProductIds = (addons || []).map((a) => a.addon_product_id);
  const [{ data: addonProducts }, { data: addonImages }] =
    addonProductIds.length > 0
      ? await Promise.all([
          supabase.from('products').select('*').in('id', addonProductIds),
          supabase.from('product_images').select('*').in('product_id', addonProductIds),
        ])
      : [{ data: [] }, { data: [] }];

  const addonProductMap = new Map((addonProducts || []).map((ap) => [ap.id, ap]));
  const addonPrimaryImageMap = new Map<string, string>();
  for (const img of addonImages || []) {
    if (!addonPrimaryImageMap.has(img.product_id)) {
      addonPrimaryImageMap.set(img.product_id, img.storage_path);
    }
  }

  const resolvedAddons: AdminProductAddonDetail[] = (addons || []).map((a) => {
    const ap = addonProductMap.get(a.addon_product_id);
    const origPrice = ap?.selling_price || 0;
    const effectivePrice = a.price_override !== null && a.price_override !== undefined
      ? Number(a.price_override)
      : origPrice;

    return {
      id: a.id,
      addonProductId: a.addon_product_id,
      addonName: ap?.name || 'Add-on Item',
      addonSku: ap?.sku || null,
      addonOriginalPrice: origPrice,
      priceOverride: a.price_override !== null && a.price_override !== undefined ? Number(a.price_override) : null,
      effectivePrice,
      minQuantity: a.min_quantity ?? 1,
      maxQuantity: a.max_quantity ?? 5,
      active: a.active !== false,
      primaryImage: addonPrimaryImageMap.get(a.addon_product_id) || null,
    };
  });

  // Resolve inventory breakdown by warehouse
  const warehouseMap = new Map((warehouses || []).map((w) => [w.id, w]));
  let totalStock = 0;
  let availableStock = 0;

  const resolvedInventory = (inventory || []).map((inv) => {
    const wh = warehouseMap.get(inv.warehouse_id);
    const onHand = Number((inv as Record<string, unknown>).quantity_on_hand ?? inv.quantity ?? 0);
    const reserved = Number((inv as Record<string, unknown>).quantity_reserved ?? inv.reserved_quantity ?? 0);
    const available = Math.max(0, onHand - reserved);

    totalStock += onHand;
    availableStock += available;

    return {
      warehouseId: inv.warehouse_id,
      warehouseName: wh?.name || inv.warehouse_id,
      warehouseCode: (wh as Record<string, unknown>)?.code as string || '',
      quantityOnHand: onHand,
      quantityReserved: reserved,
      availableToSell: available,
    };
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || null,
    sku: product.sku || null,
    product_type: product.product_type,
    selling_price: product.selling_price,
    cost_price: product.cost_price || 0,
    status: product.status,
    requires_customization: product.requires_customization || false,
    supports_theme_customization: Boolean((product as Record<string, unknown>).supports_theme_customization),
    organization_id: product.organization_id,
    images: sortedImages.map((img) => ({
      id: img.id,
      storage_path: img.storage_path,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order || 0,
    })),
    categories: resolvedCats,
    addons: resolvedAddons,
    inventory: resolvedInventory,
    totalStock,
    availableStock,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/**
 * Creates a new product with validated unique slug, SKU uniqueness check, categories, and images.
 */
export async function createAdminProduct(
  supabase: SupabaseClient<Database>,
  input: CreateProductInput,
  userId: string,
  organizationId: string
): Promise<AdminProductDetail> {
  // 1. Generate unique slug
  const finalSlug = input.slug
    ? await generateUniqueSlug(supabase, input.slug, organizationId)
    : await generateUniqueSlug(supabase, input.name, organizationId);

  // 2. Resolve & validate SKU (auto-generate if not provided)
  let resolvedSku = input.sku ? input.sku.trim() : generateAutoSku(input.name, input.product_type);

  if (resolvedSku) {
    let attempts = 0;
    while (attempts < 5) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('sku', resolvedSku);

      if (!existingSku || existingSku.length === 0) {
        break;
      }

      if (input.sku && input.sku.trim()) {
        throw new Error(`A product with SKU "${input.sku}" already exists.`);
      }

      // If auto-generated collision, re-generate with new suffix
      resolvedSku = generateAutoSku(input.name, input.product_type);
      attempts++;
    }
  }

  // 3. Insert product record
  const { data: insertedProduct, error: insertErr } = await supabase
    .from('products')
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      slug: finalSlug,
      description: input.description || null,
      sku: resolvedSku || null,
      product_type: input.product_type,
      selling_price: input.selling_price,
      cost_price: input.cost_price,
      requires_customization: input.requires_customization,
      status: input.status,
    } as unknown as Database['public']['Tables']['products']['Insert'])
    .select()
    .single();

  if (insertErr || !insertedProduct) {
    throw new Error(`Failed to create product: ${insertErr?.message}`);
  }

  const productId = insertedProduct.id;

  // 4. Attach categories if provided
  if (input.category_ids && input.category_ids.length > 0) {
    const catInserts = input.category_ids.map((catId) => ({
      product_id: productId,
      category_id: catId,
    }));
    await supabase.from('product_categories').insert(catInserts as unknown as Database['public']['Tables']['product_categories']['Insert']);
  }

  // 5. Attach images if provided
  if (input.images && input.images.length > 0) {
    const imgInserts = input.images.map((img, idx) => ({
      product_id: productId,
      storage_path: img.storage_path,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order ?? idx,
    }));
    await supabase.from('product_images').insert(imgInserts as unknown as Database['public']['Tables']['product_images']['Insert']);
  }

  // 6. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.created',
    entity_type: 'product',
    entity_id: productId,
    after_data: {
      name: insertedProduct.name,
      slug: insertedProduct.slug,
      selling_price: insertedProduct.selling_price,
      status: insertedProduct.status,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Publish domain event
  await publishDomainEvent(supabase, {
    eventType: 'product.created',
    aggregateType: 'product',
    aggregateId: productId,
    payload: {
      productId,
      name: insertedProduct.name,
      slug: insertedProduct.slug,
      sellingPrice: insertedProduct.selling_price,
      status: insertedProduct.status,
      organizationId,
      createdBy: userId,
    },
  });

  return getAdminProductDetail(supabase, productId, organizationId);
}

/**
 * Updates an existing product with slug validation, SKU validation, category sync, and image sync.
 */
export async function updateAdminProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  input: UpdateProductInput,
  userId: string,
  organizationId: string
): Promise<AdminProductDetail> {
  // 1. Verify existence and organization ownership
  const { data: existing, error: findErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (findErr || !existing) {
    throw new Error(`Product not found: ${productId}`);
  }

  if (existing.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot modify products belonging to another organization`);
  }

  // 2. Validate and generate unique slug if changed
  let finalSlug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    finalSlug = await generateUniqueSlug(supabase, input.slug, organizationId, productId);
  } else if (input.name && input.name !== existing.name && !input.slug) {
    // Preserve existing slug unless explicitly edited
    finalSlug = existing.slug;
  }

  // 3. Validate SKU uniqueness if changed
  if (input.sku && input.sku.trim() !== (existing.sku || '')) {
    const { data: existingSku } = await supabase
      .from('products')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('sku', input.sku.trim())
      .neq('id', productId);

    if (existingSku && existingSku.length > 0) {
      throw new Error(`A product with SKU "${input.sku}" already exists.`);
    }
  }

  const previousStatus = existing.status;
  const previousName = existing.name;
  const previousPrice = existing.selling_price;

  // 4. Update product table
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (finalSlug !== undefined) updatePayload.slug = finalSlug;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.sku !== undefined) updatePayload.sku = input.sku ? input.sku.trim() : null;
  if (input.product_type !== undefined) updatePayload.product_type = input.product_type;
  if (input.selling_price !== undefined) updatePayload.selling_price = input.selling_price;
  if (input.cost_price !== undefined) updatePayload.cost_price = input.cost_price;
  if (input.requires_customization !== undefined) updatePayload.requires_customization = input.requires_customization;
  if ((input as Record<string, unknown>).supports_theme_customization !== undefined) {
    updatePayload.supports_theme_customization = (input as Record<string, unknown>).supports_theme_customization;
  }
  if (input.status !== undefined) updatePayload.status = input.status;

  const { error: updateErr } = await supabase
    .from('products')
    .update(updatePayload as unknown as Database['public']['Tables']['products']['Update'])
    .eq('id', productId);

  if (updateErr) {
    throw new Error(`Failed to update product: ${updateErr.message}`);
  }

  // 5. Sync categories if provided
  if (input.category_ids !== undefined) {
    await supabase.from('product_categories').delete().eq('product_id', productId);
    if (input.category_ids.length > 0) {
      const catInserts = input.category_ids.map((catId) => ({
        product_id: productId,
        category_id: catId,
      }));
      await supabase.from('product_categories').insert(catInserts as unknown as Database['public']['Tables']['product_categories']['Insert']);
    }
  }

  // 6. Sync images if provided
  if (input.images !== undefined) {
    await supabase.from('product_images').delete().eq('product_id', productId);
    if (input.images.length > 0) {
      const imgInserts = input.images.map((img, idx) => ({
        product_id: productId,
        storage_path: img.storage_path,
        alt_text: img.alt_text || null,
        sort_order: img.sort_order ?? idx,
      }));
      await supabase.from('product_images').insert(imgInserts as unknown as Database['public']['Tables']['product_images']['Insert']);
    }
  }

  // 7. Audit log & Domain events
  const action = input.status && input.status !== previousStatus
    ? input.status === 'published'
      ? 'product.published'
      : input.status === 'draft'
      ? 'product.unpublished'
      : 'product.updated'
    : 'product.updated';

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action,
    entity_type: 'product',
    entity_id: productId,
    before_data: {
      name: previousName,
      selling_price: previousPrice,
      status: previousStatus,
    },
    after_data: updatePayload as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  await publishDomainEvent(supabase, {
    eventType: action,
    aggregateType: 'product',
    aggregateId: productId,
    payload: {
      productId,
      changes: updatePayload as unknown as Record<string, unknown>,
      organizationId,
      updatedBy: userId,
    } as unknown as Json,
  });

  return getAdminProductDetail(supabase, productId, organizationId);
}

/**
 * Safely archives a product instead of hard-deleting to preserve order and historical integrity.
 */
export async function deleteOrArchiveAdminProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  userId: string,
  organizationId: string
) {
  const { data: existing, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error || !existing) {
    throw new Error(`Product not found: ${productId}`);
  }

  if (existing.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot archive products belonging to another organization`);
  }

  // Check if product is currently used in any bundles
  const { data: bundleUsage } = await supabase
    .from('bundle_items')
    .select('id')
    .eq('component_product_id', productId)
    .limit(1);

  if (bundleUsage && bundleUsage.length > 0) {
    throw new Error('This product is currently used in one or more bundles. Remove it from those bundles before deleting the product.');
  }

  await supabase
    .from('products')
    .update({
      status: 'archived',
      updated_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['products']['Update'])
    .eq('id', productId);

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.archived',
    entity_type: 'product',
    entity_id: productId,
    before_data: { status: existing.status },
    after_data: { status: 'archived' },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // Domain event
  await publishDomainEvent(supabase, {
    eventType: 'product.archived',
    aggregateType: 'product',
    aggregateId: productId,
    payload: {
      productId,
      organizationId,
      archivedBy: userId,
    },
  });

  return { success: true, productId, status: 'archived' };
}

/**
 * Adds an add-on product relationship with validation against self-selection, duplicates, and cross-tenant leakage.
 */
export async function addProductAddon(
  supabase: SupabaseClient<Database>,
  parentProductId: string,
  input: ProductAddonInput,
  organizationId: string,
  userId: string
) {
  // 1. Prevent self-selection
  if (parentProductId === input.addon_product_id) {
    throw new Error('A product cannot be attached as an add-on to itself.');
  }

  // 2. Verify parent product belongs to organization
  const { data: parent } = await supabase
    .from('products')
    .select('id, organization_id')
    .eq('id', parentProductId)
    .maybeSingle();

  if (!parent || parent.organization_id !== organizationId) {
    throw new Error('Parent product not found or unauthorized');
  }

  // 3. Verify add-on product belongs to organization
  const { data: addonProduct } = await supabase
    .from('products')
    .select('id, organization_id, status')
    .eq('id', input.addon_product_id)
    .maybeSingle();

  if (!addonProduct || addonProduct.organization_id !== organizationId) {
    throw new Error('Selected add-on product belongs to a different organization or does not exist');
  }

  // 4. Check for duplicate add-on relationship
  const { data: existingAddons } = await supabase
    .from('product_addons')
    .select('id')
    .eq('parent_product_id', parentProductId)
    .eq('addon_product_id', input.addon_product_id);

  if (existingAddons && existingAddons.length > 0) {
    throw new Error('This add-on is already linked to the product.');
  }

  // 5. Insert add-on
  const { data: inserted, error: insErr } = await supabase
    .from('product_addons')
    .insert({
      parent_product_id: parentProductId,
      addon_product_id: input.addon_product_id,
      price_override: input.price_override ?? null,
      min_quantity: input.min_quantity ?? 1,
      max_quantity: input.max_quantity ?? 5,
      active: input.active !== false,
    } as unknown as Database['public']['Tables']['product_addons']['Insert'])
    .select()
    .single();

  if (insErr || !inserted) {
    throw new Error(`Failed to add add-on: ${insErr?.message}`);
  }

  // Audit log & domain event
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.addon_added',
    entity_type: 'product_addon',
    entity_id: inserted.id,
    after_data: inserted as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  await publishDomainEvent(supabase, {
    eventType: 'product.addon_added',
    aggregateType: 'product',
    aggregateId: parentProductId,
    payload: {
      parentProductId,
      addonProductId: input.addon_product_id,
      addonRelationId: inserted.id,
      organizationId,
    },
  });

  return inserted;
}

/**
 * Updates an add-on relationship (price override, quantities, active toggle).
 */
export async function updateProductAddon(
  supabase: SupabaseClient<Database>,
  parentProductId: string,
  addonRelationId: string,
  input: UpdateProductAddonInput,
  organizationId: string,
  userId: string
) {
  // Verify parent product belongs to organization
  const { data: parent } = await supabase
    .from('products')
    .select('id, organization_id')
    .eq('id', parentProductId)
    .maybeSingle();

  if (!parent || parent.organization_id !== organizationId) {
    throw new Error('Parent product not found or unauthorized');
  }

  const updateData: Record<string, unknown> = {};
  if (input.price_override !== undefined) updateData.price_override = input.price_override;
  if (input.min_quantity !== undefined) updateData.min_quantity = input.min_quantity;
  if (input.max_quantity !== undefined) updateData.max_quantity = input.max_quantity;
  if (input.active !== undefined) updateData.active = input.active;

  const { data: updated, error: updErr } = await supabase
    .from('product_addons')
    .update(updateData as unknown as Database['public']['Tables']['product_addons']['Update'])
    .eq('id', addonRelationId)
    .eq('parent_product_id', parentProductId)
    .select()
    .single();

  if (updErr || !updated) {
    throw new Error(`Failed to update add-on: ${updErr?.message}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.addon_updated',
    entity_type: 'product_addon',
    entity_id: addonRelationId,
    after_data: updateData as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return updated;
}

/**
 * Removes an add-on relationship from a product.
 */
export async function removeProductAddon(
  supabase: SupabaseClient<Database>,
  parentProductId: string,
  addonRelationId: string,
  organizationId: string,
  userId: string
) {
  // Verify parent product belongs to organization
  const { data: parent } = await supabase
    .from('products')
    .select('id, organization_id')
    .eq('id', parentProductId)
    .maybeSingle();

  if (!parent || parent.organization_id !== organizationId) {
    throw new Error('Parent product not found or unauthorized');
  }

  const { error: delErr } = await supabase
    .from('product_addons')
    .delete()
    .eq('id', addonRelationId)
    .eq('parent_product_id', parentProductId);

  if (delErr) {
    throw new Error(`Failed to remove add-on: ${delErr.message}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.addon_removed',
    entity_type: 'product_addon',
    entity_id: addonRelationId,
    before_data: { parentProductId, addonRelationId },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true, addonRelationId };
}

/**
 * Lists all categories for an organization.
 */
export async function listCategories(
  supabase: SupabaseClient<Database>,
  organizationId?: string
) {
  let query = supabase.from('categories').select('*');
  if (organizationId) {
    if (typeof (query as any).or === 'function') {
      query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
    } else {
      query = query.eq('organization_id', organizationId);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list categories: ${error.message}`);
  }

  return (data || []).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Creates a new category for an organization with a generated slug.
 */
export async function createCategory(
  supabase: SupabaseClient<Database>,
  name: string,
  organizationId: string
) {
  const baseSlug = slugify(name) || 'category';
  const { data: existing } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', baseSlug);

  const slug = existing && existing.length > 0 ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

  const { data, error } = await supabase
    .from('categories')
    .insert({
      organization_id: organizationId,
      name: name.trim(),
      slug,
    } as unknown as Database['public']['Tables']['categories']['Insert'])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create category: ${error?.message}`);
  }

  return data;
}
