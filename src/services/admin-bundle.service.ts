import { SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Database, Json } from '../lib/supabase/types';
import {
  CreateBundleInput,
  UpdateBundleInput,
  AdminBundleFilters,
  AdminBundleListResponse,
  AdminBundleListItem,
  AdminBundleDetail,
  BundleComponentDetail,
  AdminBundlePricingSummary,
} from '../types/admin-bundle';
import { ProductMedia } from '../types/product-media';
import { generateUniqueSlug, slugify } from './admin-product.service';
import { generateAutoSku } from '../lib/sku-helpers';
import { publishDomainEvent } from './events.service';
import { sanitizeRichText, isRichTextEmpty } from '../lib/rich-text';

/**
 * Lists bundle products with filtering, search, sorting, and pagination.
 */
export async function listAdminBundles(
  supabase: SupabaseClient<Database>,
  filters: AdminBundleFilters
): Promise<AdminBundleListResponse> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 25));
  const offset = (page - 1) * limit;

  // 1. Filter by category if categoryId provided
  let categoryProductIds: string[] | null = null;
  if (filters.categoryId) {
    const { data: matchedProductCats } = await supabase
      .from('product_categories')
      .select('product_id')
      .eq('category_id', filters.categoryId);

    categoryProductIds = (matchedProductCats || []).map((pc) => pc.product_id);
  }

  // 2. Fetch all bundle products for organization
  let query = supabase
    .from('products')
    .select('*')
    .eq('product_type', 'bundle');

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  const { data: rawProducts, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch admin bundles: ${error.message}`);
  }

  let filtered = rawProducts || [];

  // Filter by status
  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  // Filter by category
  if (categoryProductIds !== null) {
    filtered = filtered.filter((p) => categoryProductIds!.includes(p.id));
  }

  // Filter by search term
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
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  if (paginated.length === 0) {
    return {
      bundles: [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  const bundleIds = paginated.map((b) => b.id);

  // Batch fetch media, images, categories, and bundle component counts
  const [mediaRes, imagesRes, prodCatsRes, allCatsRes, bundleItemsRes] = await Promise.all([
    supabase.from('product_media').select('*').in('product_id', bundleIds).order('sort_order', { ascending: true }),
    supabase.from('product_images').select('*').in('product_id', bundleIds).order('sort_order', { ascending: true }),
    supabase.from('product_categories').select('*').in('product_id', bundleIds),
    filters.organizationId
      ? supabase.from('categories').select('*').eq('organization_id', filters.organizationId)
      : supabase.from('categories').select('*'),
    supabase.from('bundle_items').select('bundle_product_id, id').in('bundle_product_id', bundleIds),
  ]);

  const mediaList = mediaRes.data || [];
  const images = imagesRes.data || [];
  const prodCats = prodCatsRes.data || [];
  const allCats = allCatsRes.data || [];
  const bundleItems = bundleItemsRes.data || [];

  const categoryMap = new Map((allCats || []).map((c) => [c.id, c]));

  // Primary image map (from product_media first, fallback to product_images)
  const primaryImageMap = new Map<string, string>();
  for (const m of mediaList) {
    if (!primaryImageMap.has(m.product_id)) {
      primaryImageMap.set(m.product_id, m.thumbnail_path || m.storage_path);
    }
  }
  for (const img of images) {
    if (!primaryImageMap.has(img.product_id)) {
      primaryImageMap.set(img.product_id, img.storage_path);
    }
  }

  // Component count map
  const componentCountMap = new Map<string, number>();
  for (const item of bundleItems) {
    componentCountMap.set(item.bundle_product_id, (componentCountMap.get(item.bundle_product_id) || 0) + 1);
  }

  // Categories per product
  const categoriesByProduct = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const pc of prodCats) {
    const cat = categoryMap.get(pc.category_id);
    if (cat) {
      const list = categoriesByProduct.get(pc.product_id) || [];
      list.push({ id: cat.id, name: cat.name, slug: cat.slug });
      categoriesByProduct.set(pc.product_id, list);
    }
  }

  const bundles: AdminBundleListItem[] = paginated.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    sku: b.sku,
    product_type: b.product_type,
    selling_price: Number(b.selling_price || 0),
    cost_price: Number(b.cost_price || 0),
    status: b.status,
    primaryImage: primaryImageMap.get(b.id) || null,
    categories: categoriesByProduct.get(b.id) || [],
    componentCount: componentCountMap.get(b.id) || 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  }));

  return {
    bundles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Retrieves detailed bundle product information including components and pricing summary.
 */
export async function getAdminBundleDetail(
  supabase: SupabaseClient<Database>,
  bundleId: string,
  organizationId: string
): Promise<AdminBundleDetail> {
  // 1. Fetch bundle product
  const { data: bundle, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', bundleId)
    .maybeSingle();

  if (error || !bundle) {
    throw new Error(`Bundle product not found: ${bundleId}`);
  }

  if (bundle.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot view bundles belonging to another organization`);
  }

  if (bundle.product_type !== 'bundle') {
    throw new Error(`Product ${bundleId} is not a bundle product`);
  }

  // 2. Fetch media, images, categories, and bundle items
  const [mediaRes, imagesRes, prodCatsRes, allCatsRes, bundleItemsRes] = await Promise.all([
    supabase.from('product_media').select('*').eq('product_id', bundleId).order('sort_order', { ascending: true }),
    supabase.from('product_images').select('*').eq('product_id', bundleId).order('sort_order', { ascending: true }),
    supabase.from('product_categories').select('category_id').eq('product_id', bundleId),
    supabase.from('categories').select('*').eq('organization_id', organizationId),
    supabase.from('bundle_items').select('*').eq('bundle_product_id', bundleId),
  ]);

  const rawMedia = mediaRes.data || [];
  const rawImages = imagesRes.data || [];

  const media: ProductMedia[] = rawMedia.length > 0
    ? rawMedia.map((m) => ({
        id: m.id,
        productId: m.product_id,
        type: m.type as 'image' | 'video',
        storagePath: m.storage_path,
        thumbnailPath: m.thumbnail_path ?? null,
        altText: m.alt_text ?? null,
        sortOrder: m.sort_order,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }))
    : rawImages.map((img) => ({
        id: img.id,
        productId: bundleId,
        type: 'image' as const,
        storagePath: img.storage_path,
        thumbnailPath: null,
        altText: img.alt_text ?? null,
        sortOrder: img.sort_order,
        createdAt: bundle.created_at,
        updatedAt: bundle.updated_at,
      }));

  const images = rawMedia.length > 0
    ? rawMedia
        .filter((m) => m.type === 'image')
        .map((m) => ({
          id: m.id,
          storage_path: m.storage_path,
          alt_text: m.alt_text,
          sort_order: m.sort_order,
        }))
    : rawImages.map((img) => ({
        id: img.id,
        storage_path: img.storage_path,
        alt_text: img.alt_text,
        sort_order: img.sort_order,
      }));

  const categoryMap = new Map((allCatsRes.data || []).map((c) => [c.id, c]));
  const categories = (prodCatsRes.data || [])
    .map((pc) => categoryMap.get(pc.category_id))
    .filter(Boolean)
    .map((c) => ({ id: c!.id, name: c!.name, slug: c!.slug }));

  const rawBundleItems = bundleItemsRes.data || [];
  const componentProductIds = rawBundleItems.map((bi) => bi.component_product_id);

  // Fetch component product details
  let componentDetails: BundleComponentDetail[] = [];
  if (componentProductIds.length > 0) {
    const [compProductsRes, compImagesRes] = await Promise.all([
      supabase.from('products').select('*').in('id', componentProductIds),
      supabase.from('product_images').select('*').in('product_id', componentProductIds),
    ]);

    const compProductMap = new Map((compProductsRes.data || []).map((p) => [p.id, p]));
    const compImageMap = new Map<string, string>();
    const sortedCompImages = [...(compImagesRes.data || [])].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    for (const img of sortedCompImages) {
      if (!compImageMap.has(img.product_id)) {
        compImageMap.set(img.product_id, img.storage_path);
      }
    }

    componentDetails = rawBundleItems
      .map((bi) => {
        const comp = compProductMap.get(bi.component_product_id);
        if (!comp) return null;
        const sellingPrice = Number(comp.selling_price || 0);
        const costPrice = Number(comp.cost_price || 0);
        const totalPrice = sellingPrice * bi.quantity;

        return {
          id: bi.id,
          componentProductId: comp.id,
          name: comp.name,
          slug: comp.slug,
          sku: comp.sku,
          productType: comp.product_type,
          sellingPrice,
          costPrice,
          primaryImage: compImageMap.get(comp.id) || null,
          quantity: bi.quantity,
          totalPrice,
        };
      })
      .filter(Boolean) as BundleComponentDetail[];
  }

  // Calculate pricing summary
  const componentsValue = componentDetails.reduce((sum, item) => sum + item.totalPrice, 0);
  const bundlePrice = Number(bundle.selling_price || 0);
  const customerSavings = componentsValue - bundlePrice;

  const pricingSummary: AdminBundlePricingSummary = {
    componentsValue,
    bundlePrice,
    customerSavings,
  };

  return {
    id: bundle.id,
    name: bundle.name,
    slug: bundle.slug,
    description: bundle.description,
    sku: bundle.sku,
    product_type: bundle.product_type,
    selling_price: bundlePrice,
    cost_price: Number(bundle.cost_price || 0),
    status: bundle.status,
    organization_id: bundle.organization_id,
    images,
    media,
    categories,
    components: componentDetails,
    pricingSummary,
    createdAt: bundle.created_at,
    updatedAt: bundle.updated_at,
  };
}

/**
 * Creates a new bundle product transactionally using the `create_admin_bundle` RPC.
 */
export async function createAdminBundle(
  supabase: SupabaseClient<Database>,
  input: CreateBundleInput,
  userId: string,
  organizationId: string
): Promise<AdminBundleDetail> {
  // 1. Validate slug uniqueness
  const finalSlug = input.slug
    ? await generateUniqueSlug(supabase, input.slug, organizationId)
    : await generateUniqueSlug(supabase, input.name, organizationId);

  // 2. Validate SKU uniqueness if provided
  let resolvedSku = input.sku ? input.sku.trim() : generateAutoSku(input.name, 'bundle');
  if (resolvedSku) {
    let attempts = 0;
    while (attempts < 5) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('sku', resolvedSku);

      if (!existingSku || existingSku.length === 0) break;

      if (input.sku && input.sku.trim()) {
        throw new Error(`A product with SKU "${input.sku}" already exists.`);
      }
      resolvedSku = generateAutoSku(input.name, 'bundle');
      attempts++;
    }
  }

  // 3. Verify no component product is a bundle or belongs to another organization
  const componentIds = input.components.map((c) => c.component_product_id);
  const { data: compProducts } = await supabase
    .from('products')
    .select('id, product_type, organization_id')
    .in('id', componentIds);

  const compMap = new Map((compProducts || []).map((p) => [p.id, p]));
  for (const c of input.components) {
    const comp = compMap.get(c.component_product_id);
    if (!comp) {
      throw new Error(`Component product ${c.component_product_id} does not exist`);
    }
    if (comp.organization_id !== organizationId) {
      throw new Error(`Component product ${c.component_product_id} belongs to another organization`);
    }
    if (comp.product_type === 'bundle') {
      throw new Error(`A bundle cannot contain another bundle product (${comp.id})`);
    }
  }

  // 4. Call atomic RPC function create_admin_bundle
  const { data: bundleId, error: rpcErr } = await supabase.rpc('create_admin_bundle' as unknown as keyof Database['public']['Functions'], {
    p_org_id: organizationId,
    p_name: input.name.trim(),
    p_slug: finalSlug,
    p_description: input.description
      ? isRichTextEmpty(input.description)
        ? null
        : sanitizeRichText(input.description)
      : null,
    p_sku: resolvedSku || null,
    p_selling_price: input.selling_price,
    p_cost_price: input.cost_price,
    p_status: input.status,
    p_category_ids: input.category_ids || [],
    p_images: (input.media && input.media.length > 0)
      ? input.media.map((m, idx) => ({
          type: m.type || 'image',
          storage_path: m.storage_path,
          thumbnail_path: m.thumbnail_path || null,
          alt_text: m.alt_text || null,
          sort_order: m.sort_order ?? idx,
        }))
      : (input.images || []).map((img, idx) => ({
          type: 'image',
          storage_path: img.storage_path,
          thumbnail_path: null,
          alt_text: img.alt_text || null,
          sort_order: img.sort_order ?? idx,
        })),
    p_components: input.components,
  } as unknown as Database['public']['Functions']['create_admin_bundle']['Args']);

  if (rpcErr || !bundleId) {
    throw new Error(`Failed to create bundle product: ${rpcErr?.message}`);
  }

  const createdBundleId = bundleId as string;

  // Sync product_media and product_images explicitly
  if (input.media !== undefined && input.media.length > 0) {
    const mediaInserts = input.media.map((m, idx) => ({
      id: m.id || crypto.randomUUID(),
      product_id: createdBundleId,
      type: m.type || 'image',
      storage_path: m.storage_path,
      thumbnail_path: m.thumbnail_path || null,
      alt_text: m.alt_text || null,
      sort_order: m.sort_order ?? idx,
    }));
    const imageInserts = mediaInserts
      .filter((m) => m.type === 'image')
      .map((m, idx) => ({
        id: crypto.randomUUID(),
        product_id: createdBundleId,
        storage_path: m.storage_path,
        alt_text: m.alt_text,
        sort_order: m.sort_order ?? idx,
      }));
    await Promise.all([
      supabase.from('product_media').delete().eq('product_id', createdBundleId),
      supabase.from('product_images').delete().eq('product_id', createdBundleId),
    ]);
    await Promise.all([
      supabase.from('product_media').insert(mediaInserts as unknown as Database['public']['Tables']['product_media']['Insert']),
      imageInserts.length > 0
        ? supabase.from('product_images').insert(imageInserts as unknown as Database['public']['Tables']['product_images']['Insert'])
        : Promise.resolve({ error: null }),
    ]);
  } else if (input.images !== undefined && input.images.length > 0) {
    const imgInserts = input.images.map((img, idx) => ({
      id: crypto.randomUUID(),
      product_id: createdBundleId,
      storage_path: img.storage_path,
      alt_text: img.alt_text || null,
      sort_order: img.sort_order ?? idx,
    }));
    await Promise.all([
      supabase.from('product_media').delete().eq('product_id', createdBundleId),
      supabase.from('product_images').delete().eq('product_id', createdBundleId),
    ]);
    await Promise.all([
      supabase.from('product_images').insert(imgInserts as unknown as Database['public']['Tables']['product_images']['Insert']),
      supabase.from('product_media').insert(
        imgInserts.map((img) => ({
          ...img,
          type: 'image' as const,
          thumbnail_path: null,
        })) as unknown as Database['public']['Tables']['product_media']['Insert']
      ),
    ]);
  }

  // 5. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.created',
    entity_type: 'product',
    entity_id: createdBundleId,
    after_data: {
      name: input.name,
      slug: finalSlug,
      product_type: 'bundle',
      selling_price: input.selling_price,
      component_count: input.components.length,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 6. Publish domain event
  await publishDomainEvent(supabase, {
    eventType: 'product.created',
    aggregateType: 'product',
    aggregateId: createdBundleId,
    payload: {
      productId: createdBundleId,
      name: input.name,
      slug: finalSlug,
      product_type: 'bundle',
      sellingPrice: input.selling_price,
      organizationId,
      createdBy: userId,
    },
  });

  return getAdminBundleDetail(supabase, createdBundleId, organizationId);
}

/**
 * Updates a bundle product and its component items transactionally via `update_admin_bundle` RPC.
 */
export async function updateAdminBundle(
  supabase: SupabaseClient<Database>,
  bundleId: string,
  input: UpdateBundleInput,
  userId: string,
  organizationId: string
): Promise<AdminBundleDetail> {
  // 1. Fetch current bundle detail
  const { data: existing, error: findErr } = await supabase
    .from('products')
    .select('*')
    .eq('id', bundleId)
    .maybeSingle();

  if (findErr || !existing) {
    throw new Error(`Bundle product not found: ${bundleId}`);
  }

  if (existing.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot modify bundles belonging to another organization`);
  }

  if (existing.product_type !== 'bundle') {
    throw new Error(`Product ${bundleId} is not a bundle product`);
  }

  // 2. Validate slug if changed
  let finalSlug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    finalSlug = await generateUniqueSlug(supabase, input.slug, organizationId, bundleId);
  }

  // 3. Validate SKU if changed
  let resolvedSku = existing.sku;
  if (input.sku !== undefined) {
    if (input.sku && input.sku.trim() !== (existing.sku || '')) {
      const { data: existingSku } = await supabase
        .from('products')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('sku', input.sku.trim())
        .neq('id', bundleId);

      if (existingSku && existingSku.length > 0) {
        throw new Error(`A product with SKU "${input.sku}" already exists.`);
      }
      resolvedSku = input.sku.trim();
    } else if (!input.sku) {
      resolvedSku = null;
    }
  }

  // 4. Validate component items if provided
  if (input.components) {
    const compIds = input.components.map((c) => c.component_product_id);
    const { data: compProducts } = await supabase
      .from('products')
      .select('id, product_type, organization_id')
      .in('id', compIds);

    const compMap = new Map((compProducts || []).map((p) => [p.id, p]));
    for (const c of input.components) {
      const comp = compMap.get(c.component_product_id);
      if (!comp) {
        throw new Error(`Component product ${c.component_product_id} does not exist`);
      }
      if (comp.organization_id !== organizationId) {
        throw new Error(`Component product ${c.component_product_id} belongs to another organization`);
      }
      if (comp.product_type === 'bundle') {
        throw new Error(`A bundle cannot contain another bundle product (${comp.id})`);
      }
    }
  }

  // 5. Execute atomic RPC function update_admin_bundle
  const { error: rpcErr } = await supabase.rpc('update_admin_bundle' as unknown as keyof Database['public']['Functions'], {
    p_bundle_id: bundleId,
    p_org_id: organizationId,
    p_name: input.name !== undefined ? input.name.trim() : existing.name,
    p_slug: finalSlug,
    p_description: input.description !== undefined
      ? input.description
        ? isRichTextEmpty(input.description)
          ? null
          : sanitizeRichText(input.description)
        : null
      : existing.description,
    p_sku: resolvedSku,
    p_selling_price: input.selling_price !== undefined ? input.selling_price : Number(existing.selling_price),
    p_cost_price: input.cost_price !== undefined ? input.cost_price : Number(existing.cost_price),
    p_status: input.status !== undefined ? input.status : existing.status,
    p_category_ids: input.category_ids !== undefined ? input.category_ids : null,
    p_images: input.media !== undefined
      ? input.media.map((m, idx) => ({
          type: m.type || 'image',
          storage_path: m.storage_path,
          thumbnail_path: m.thumbnail_path || null,
          alt_text: m.alt_text || null,
          sort_order: m.sort_order ?? idx,
        }))
      : input.images !== undefined
      ? input.images.map((img, idx) => ({
          type: 'image',
          storage_path: img.storage_path,
          thumbnail_path: null,
          alt_text: img.alt_text || null,
          sort_order: img.sort_order ?? idx,
        }))
      : null,
    p_components: input.components !== undefined ? input.components : null,
  } as unknown as Database['public']['Functions']['update_admin_bundle']['Args']);

  if (rpcErr) {
    throw new Error(`Failed to update bundle product: ${rpcErr.message}`);
  }

  // Explicit sync of product_media & product_images tables
  if (input.media !== undefined) {
    await Promise.all([
      supabase.from('product_images').delete().eq('product_id', bundleId),
      supabase.from('product_media').delete().eq('product_id', bundleId),
    ]);
    if (input.media.length > 0) {
      const mediaInserts = input.media.map((m, idx) => ({
        id: m.id || crypto.randomUUID(),
        product_id: bundleId,
        type: m.type || 'image',
        storage_path: m.storage_path,
        thumbnail_path: m.thumbnail_path || null,
        alt_text: m.alt_text || null,
        sort_order: m.sort_order ?? idx,
      }));
      const imgInserts = mediaInserts
        .filter((m) => m.type === 'image')
        .map((m, idx) => ({
          id: crypto.randomUUID(),
          product_id: bundleId,
          storage_path: m.storage_path,
          alt_text: m.alt_text,
          sort_order: m.sort_order ?? idx,
        }));
      await Promise.all([
        supabase.from('product_media').insert(mediaInserts as unknown as Database['public']['Tables']['product_media']['Insert']),
        imgInserts.length > 0
          ? supabase.from('product_images').insert(imgInserts as unknown as Database['public']['Tables']['product_images']['Insert'])
          : Promise.resolve({ error: null }),
      ]);
    }
  } else if (input.images !== undefined) {
    await Promise.all([
      supabase.from('product_images').delete().eq('product_id', bundleId),
      supabase.from('product_media').delete().eq('product_id', bundleId).eq('type', 'image'),
    ]);
    if (input.images.length > 0) {
      const imgInserts = input.images.map((img, idx) => ({
        id: crypto.randomUUID(),
        product_id: bundleId,
        storage_path: img.storage_path,
        alt_text: img.alt_text || null,
        sort_order: img.sort_order ?? idx,
      }));
      await Promise.all([
        supabase.from('product_images').insert(imgInserts as unknown as Database['public']['Tables']['product_images']['Insert']),
        supabase.from('product_media').insert(
          imgInserts.map((img) => ({
            ...img,
            type: 'image' as const,
            thumbnail_path: null,
          })) as unknown as Database['public']['Tables']['product_media']['Insert']
        ),
      ]);
    }
  }

  // 6. Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.updated',
    entity_type: 'product',
    entity_id: bundleId,
    before_data: {
      name: existing.name,
      status: existing.status,
      selling_price: existing.selling_price,
    },
    after_data: {
      name: input.name,
      status: input.status,
      selling_price: input.selling_price,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // 7. Publish domain event
  await publishDomainEvent(supabase, {
    eventType: 'product.updated',
    aggregateType: 'product',
    aggregateId: bundleId,
    payload: {
      productId: bundleId,
      organizationId,
      updatedBy: userId,
    },
  });

  return getAdminBundleDetail(supabase, bundleId, organizationId);
}

/**
 * Duplicates a bundle product and its components into a new bundle product.
 */
export async function duplicateAdminBundle(
  supabase: SupabaseClient<Database>,
  sourceBundleId: string,
  userId: string,
  organizationId: string,
  overrides?: { name?: string; slug?: string; sku?: string }
): Promise<AdminBundleDetail> {
  // 1. Fetch source bundle
  const { data: source, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', sourceBundleId)
    .maybeSingle();

  if (error || !source) {
    throw new Error(`Source bundle product not found: ${sourceBundleId}`);
  }

  if (source.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot duplicate bundles belonging to another organization`);
  }

  if (source.product_type !== 'bundle') {
    throw new Error(`Source product ${sourceBundleId} is not a bundle product`);
  }

  // 2. Generate or validate unique name, slug, and SKU
  const newName = overrides?.name?.trim() || `${source.name} (Copy)`;
  const newSlug = overrides?.slug?.trim()
    ? await generateUniqueSlug(supabase, overrides.slug, organizationId)
    : await generateUniqueSlug(supabase, newName, organizationId);
  const newSku = overrides?.sku?.trim() || generateAutoSku(newName, 'bundle');

  // 3. Call atomic RPC duplicate_admin_bundle
  const { data: newBundleId, error: rpcErr } = await supabase.rpc('duplicate_admin_bundle' as unknown as keyof Database['public']['Functions'], {
    p_bundle_id: sourceBundleId,
    p_org_id: organizationId,
    p_new_name: newName,
    p_new_slug: newSlug,
    p_new_sku: newSku,
  } as unknown as Database['public']['Functions']['duplicate_admin_bundle']['Args']);

  if (rpcErr || !newBundleId) {
    throw new Error(`Failed to duplicate bundle product: ${rpcErr?.message}`);
  }

  const createdId = newBundleId as string;

  // 4. Audit log & domain event
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: 'product.created',
    entity_type: 'product',
    entity_id: createdId,
    after_data: {
      duplicated_from: sourceBundleId,
      name: newName,
      slug: newSlug,
    },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  await publishDomainEvent(supabase, {
    eventType: 'product.created',
    aggregateType: 'product',
    aggregateId: createdId,
    payload: {
      productId: createdId,
      duplicatedFrom: sourceBundleId,
      organizationId,
      createdBy: userId,
    },
  });

  return getAdminBundleDetail(supabase, createdId, organizationId);
}

/**
 * Deactivates or archives a bundle product.
 */
export async function deactivateAdminBundle(
  supabase: SupabaseClient<Database>,
  bundleId: string,
  userId: string,
  organizationId: string,
  targetStatus: 'archived' | 'draft' | 'published' = 'archived'
) {
  const { data: existing, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', bundleId)
    .maybeSingle();

  if (error || !existing) {
    throw new Error(`Bundle product not found: ${bundleId}`);
  }

  if (existing.organization_id !== organizationId) {
    throw new Error(`Forbidden: You cannot modify bundles belonging to another organization`);
  }

  if (existing.product_type !== 'bundle') {
    throw new Error(`Product ${bundleId} is not a bundle product`);
  }

  await supabase
    .from('products')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['products']['Update'])
    .eq('id', bundleId);

  // Audit log & domain event
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: userId,
    user_id: userId,
    action: targetStatus === 'archived' ? 'product.archived' : 'product.updated',
    entity_type: 'product',
    entity_id: bundleId,
    before_data: { status: existing.status },
    after_data: { status: targetStatus },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  await publishDomainEvent(supabase, {
    eventType: targetStatus === 'archived' ? 'product.archived' : 'product.updated',
    aggregateType: 'product',
    aggregateId: bundleId,
    payload: {
      productId: bundleId,
      status: targetStatus,
      organizationId,
      updatedBy: userId,
    },
  });

  return { success: true, bundleId, status: targetStatus };
}
