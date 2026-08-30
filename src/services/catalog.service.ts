import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export interface BundleComponentDetail {
  id: string;
  componentProductId: string;
  name: string;
  slug: string;
  quantity: number;
  primaryImage: string | null;
  unitPrice: number;
}

export interface CatalogProductItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sku: string;
  requiresCustomization: boolean;
  productType?: 'physical' | 'custom' | 'bundle';
  bundleComponentsCount?: number;
  isAvailable: boolean;
  availableStock: number;
  primaryImage: string | null;
  images: { id: string; imageUrl: string; isPrimary: boolean }[];
  categories: { id: string; name: string; slug: string }[];
  createdAt?: string;
}

export interface ProductDetailAddon {
  id: string;
  addonProductId: string;
  name: string;
  sku: string;
  originalPrice: number;
  price: number; // Effective price (price_override if present else originalPrice)
  priceOverride: number | null;
  isRequired: boolean;
  isAvailable: boolean;
  availableStock: number;
  primaryImage: string | null;
}

export interface ProductDetail extends CatalogProductItem {
  addons: ProductDetailAddon[];
  bundleItems?: BundleComponentDetail[];
}

export interface CatalogQueryOptions {
  search?: string;
  q?: string;
  categorySlug?: string;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | string;
  inStockOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Fetches active/published products with primary images, categories, and inventory availability.
 */
export async function getPublishedCatalog(
  supabase: SupabaseClient<Database>,
  options?: CatalogQueryOptions
): Promise<CatalogProductItem[]> {
  const searchTerm = options?.search || options?.q;

  // 1. Fetch products
  const { data: rawProducts, error: prodErr } = await supabase
    .from('products')
    .select('*');

  if (prodErr) {
    throw new Error(`Failed to query products: ${prodErr.message}`);
  }

  // Filter for published / active products
  let products = (rawProducts || []).filter((p) => {
    if (p.status) return p.status === 'published';
    if ((p as Record<string, unknown>).is_active !== undefined) return (p as Record<string, unknown>).is_active as boolean;
    return true;
  });

  if (!products || products.length === 0) {
    return [];
  }

  // Filter by search query across name, description, SKU
  if (searchTerm && searchTerm.trim()) {
    const qLower = searchTerm.trim().toLowerCase();
    products = products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(qLower)) ||
        (p.description && p.description.toLowerCase().includes(qLower)) ||
        (p.sku && p.sku.toLowerCase().includes(qLower))
    );
  }

  if (products.length === 0) {
    return [];
  }

  const productIds = products.map((p) => p.id);
  const bundleProductIds = products.filter((p) => p.product_type === 'bundle').map((p) => p.id);

  // Fetch bundle items if any products are bundles
  let bundleItems: Database['public']['Tables']['bundle_items']['Row'][] = [];
  if (bundleProductIds.length > 0) {
    const { data: bItems } = await supabase
      .from('bundle_items')
      .select('*')
      .in('bundle_product_id', bundleProductIds);
    bundleItems = bItems || [];
  }

  const componentProductIds = [...new Set(bundleItems.map((bi) => bi.component_product_id))];
  const allInventoryProductIds = [...new Set([...productIds, ...componentProductIds])];

  // 2. Fetch images, product categories, and inventory
  const [
    { data: images },
    { data: productCats },
    { data: categories },
    { data: inventory },
  ] = await Promise.all([
    supabase
      .from('product_images')
      .select('*')
      .in('product_id', productIds),
    supabase
      .from('product_categories')
      .select('*')
      .in('product_id', productIds),
    supabase.from('categories').select('*'),
    supabase
      .from('inventory')
      .select('product_id, quantity, reserved_quantity')
      .in('product_id', allInventoryProductIds),
  ]);

  const imagesByProduct = new Map<string, typeof images>();
  for (const img of images || []) {
    if (!imagesByProduct.has(img.product_id)) {
      imagesByProduct.set(img.product_id, []);
    }
    imagesByProduct.get(img.product_id)!.push(img);
  }

  const categoryMap = new Map((categories || []).map((c) => [c.id, c]));
  const categoriesByProduct = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const pc of productCats || []) {
    const cat = categoryMap.get(pc.category_id);
    if (cat) {
      if (!categoriesByProduct.has(pc.product_id)) {
        categoriesByProduct.set(pc.product_id, []);
      }
      categoriesByProduct.get(pc.product_id)!.push({ id: cat.id, name: cat.name, slug: cat.slug });
    }
  }

  // Aggregate available inventory across warehouses
  const stockByProduct = new Map<string, number>();
  for (const inv of inventory || []) {
    const onHand = Number((inv as Record<string, unknown>).quantity_on_hand ?? inv.quantity ?? 0);
    const reserved = Number((inv as Record<string, unknown>).quantity_reserved ?? inv.reserved_quantity ?? 0);
    const avail = Math.max(0, onHand - reserved);
    const curr = stockByProduct.get(inv.product_id) || 0;
    stockByProduct.set(inv.product_id, curr + avail);
  }

  // Calculate virtual available stock for bundle products based on component availability
  const bundleItemsByBundle = new Map<string, typeof bundleItems>();
  for (const bi of bundleItems) {
    const list = bundleItemsByBundle.get(bi.bundle_product_id) || [];
    list.push(bi);
    bundleItemsByBundle.set(bi.bundle_product_id, list);
  }

  for (const bundleId of bundleProductIds) {
    const items = bundleItemsByBundle.get(bundleId) || [];
    if (items.length === 0) {
      stockByProduct.set(bundleId, 0);
    } else {
      let minPossible = Infinity;
      for (const item of items) {
        const compAvail = stockByProduct.get(item.component_product_id) || 0;
        const qtyPerBundle = Math.max(1, item.quantity || 1);
        const possibleForComp = Math.floor(compAvail / qtyPerBundle);
        if (possibleForComp < minPossible) {
          minPossible = possibleForComp;
        }
      }
      stockByProduct.set(bundleId, isFinite(minPossible) ? Math.max(0, minPossible) : 0);
    }
  }

  let catalog: CatalogProductItem[] = products.map((p) => {
    const prodImages = imagesByProduct.get(p.id) || [];
    const sortedImages = [...prodImages].sort((a, b) => {
      const aOrder =
        (a as Record<string, unknown>).sort_order !== undefined
          ? Number((a as Record<string, unknown>).sort_order)
          : (a as Record<string, unknown>).is_primary
          ? 0
          : 1;
      const bOrder =
        (b as Record<string, unknown>).sort_order !== undefined
          ? Number((b as Record<string, unknown>).sort_order)
          : (b as Record<string, unknown>).is_primary
          ? 0
          : 1;
      return aOrder - bOrder;
    });
    const primaryImage =
      ((sortedImages[0] as Record<string, unknown>)?.storage_path as string) ||
      ((sortedImages[0] as Record<string, unknown>)?.image_url as string) ||
      null;
    const stock = stockByProduct.get(p.id) || 0;
    const cats = categoriesByProduct.get(p.id) || [];
    const effectivePrice =
      p.selling_price !== undefined && p.selling_price !== null
        ? p.selling_price
        : ((p as Record<string, unknown>).price as number) || 0;

    const bComponents = bundleItemsByBundle.get(p.id) || [];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: effectivePrice,
      sku: p.sku || '',
      requiresCustomization: p.requires_customization ?? false,
      productType: p.product_type || 'physical',
      bundleComponentsCount: p.product_type === 'bundle' ? bComponents.length : undefined,
      isAvailable: stock > 0,
      availableStock: stock,
      primaryImage,
      images: sortedImages.map((img) => ({
        id: img.id,
        imageUrl:
          ((img as Record<string, unknown>).storage_path as string) ||
          ((img as Record<string, unknown>).image_url as string) ||
          '',
        isPrimary:
          (img as Record<string, unknown>).sort_order === 0 || (img as Record<string, unknown>).is_primary === true,
      })),
      categories: cats,
      createdAt: p.created_at,
    };
  });

  // Filter by categorySlug if supplied
  if (options?.categorySlug && options.categorySlug.trim()) {
    const targetSlug = options.categorySlug.trim().toLowerCase();
    catalog = catalog.filter((p) =>
      p.categories.some((c) => c.slug.toLowerCase() === targetSlug)
    );
  }

  // Filter by inStockOnly
  if (options?.inStockOnly) {
    catalog = catalog.filter((p) => p.isAvailable);
  }

  // Sorting
  if (options?.sort) {
    switch (options.sort) {
      case 'price-asc':
        catalog.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        catalog.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        catalog.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'featured':
      default:
        // Keep default order
        break;
    }
  }

  // Pagination / Limit
  if (options?.page && options.page > 0 && options?.limit && options.limit > 0) {
    const startIndex = (options.page - 1) * options.limit;
    catalog = catalog.slice(startIndex, startIndex + options.limit);
  } else if (options?.limit && options.limit > 0) {
    catalog = catalog.slice(0, options.limit);
  }

  return catalog;
}

/**
 * Fetches a single active product detail by slug, including eligible active add-ons.
 */
export async function getProductDetailBySlug(
  supabase: SupabaseClient<Database>,
  slug: string
): Promise<ProductDetail | null> {
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (prodErr || !product) {
    return null;
  }

  // Ensure published
  if (product.status && product.status !== 'published') {
    return null;
  }
  if (
    (product as Record<string, unknown>).is_active !== undefined &&
    (product as Record<string, unknown>).is_active === false
  ) {
    return null;
  }

  const catalogItems = await getPublishedCatalog(supabase);
  const catalogItem = catalogItems.find((c) => c.id === product.id);
  if (!catalogItem) {
    return null;
  }

  // Fetch configured add-ons
  const [{ data: addonsByParent }, { data: addonsByProduct }] = await Promise.all([
    supabase.from('product_addons').select('*').eq('parent_product_id', product.id),
    supabase
      .from('product_addons')
      .select('*')
      .eq('product_id' as unknown as 'parent_product_id', product.id),
  ]);

  const addonConfigs =
    addonsByParent && addonsByParent.length > 0
      ? addonsByParent
      : addonsByProduct || [];
  const activeAddonConfigs = addonConfigs.filter(
    (a) => (a as Record<string, unknown>).active !== false
  );

  const addonProductIds = activeAddonConfigs.map((a) => a.addon_product_id);
  let addonDetails: ProductDetailAddon[] = [];

  if (addonProductIds.length > 0) {
    const [{ data: addonProducts }, { data: addonImages }, { data: addonInventory }] =
      await Promise.all([
        supabase.from('products').select('*').in('id', addonProductIds),
        supabase.from('product_images').select('*').in('product_id', addonProductIds),
        supabase.from('inventory').select('*').in('product_id', addonProductIds),
      ]);

    const publishedAddonProds = (addonProducts || []).filter((p) =>
      p.status
        ? p.status === 'published'
        : (p as Record<string, unknown>).is_active !== false
    );
    const addonProdMap = new Map(publishedAddonProds.map((p) => [p.id, p]));

    const addonImgMap = new Map<string, string>();
    for (const img of addonImages || []) {
      const isPrimary =
        (img as Record<string, unknown>).sort_order === 0 || (img as Record<string, unknown>).is_primary === true;
      const url =
        ((img as Record<string, unknown>).storage_path as string) || ((img as Record<string, unknown>).image_url as string);
      if (isPrimary || !addonImgMap.has(img.product_id)) {
        addonImgMap.set(img.product_id, url);
      }
    }

    const addonStockMap = new Map<string, number>();
    for (const inv of addonInventory || []) {
      const avail = Math.max(0, (inv.quantity || 0) - (inv.reserved_quantity || 0));
      const curr = addonStockMap.get(inv.product_id) || 0;
      addonStockMap.set(inv.product_id, curr + avail);
    }

    addonDetails = activeAddonConfigs
      .map((cfg) => {
        const prod = addonProdMap.get(cfg.addon_product_id);
        if (!prod) return null;

        const stock = addonStockMap.get(prod.id) || 0;
        const originalPrice =
          prod.selling_price !== undefined && prod.selling_price !== null
            ? prod.selling_price
            : ((prod as Record<string, unknown>).price as number) || 0;
        const effectivePrice =
          cfg.price_override !== null && cfg.price_override !== undefined
            ? cfg.price_override
            : originalPrice;

        return {
          id: cfg.id,
          addonProductId: prod.id,
          name: prod.name,
          sku: prod.sku || '',
          originalPrice,
          price: effectivePrice,
          priceOverride: cfg.price_override,
          isRequired:
            ((cfg as Record<string, unknown>).is_required as boolean) ??
            cfg.min_quantity > 0,
          isAvailable: stock > 0,
          availableStock: stock,
          primaryImage: addonImgMap.get(prod.id) || null,
        };
      })
      .filter((a): a is ProductDetailAddon => a !== null);
  }

  let bundleItems: BundleComponentDetail[] = [];
  if (product.product_type === 'bundle') {
    const { data: bItems } = await supabase
      .from('bundle_items')
      .select('*')
      .eq('bundle_product_id', product.id);

    const compIds = (bItems || []).map((bi) => bi.component_product_id);
    if (compIds.length > 0) {
      const [{ data: compProds }, { data: compImgs }] = await Promise.all([
        supabase.from('products').select('*').in('id', compIds),
        supabase.from('product_images').select('*').in('product_id', compIds),
      ]);

      const compImgMap = new Map<string, string>();
      for (const img of compImgs || []) {
        if ((img as Record<string, unknown>).sort_order === 0 || !compImgMap.has(img.product_id)) {
          const url = ((img as Record<string, unknown>).storage_path as string) || ((img as Record<string, unknown>).image_url as string);
          compImgMap.set(img.product_id, url);
        }
      }

      const compProdMap = new Map((compProds || []).map((p) => [p.id, p]));

      bundleItems = (bItems || [])
        .map((bi) => {
          const p = compProdMap.get(bi.component_product_id);
          if (!p) return null;
          return {
            id: bi.id,
            componentProductId: p.id,
            name: p.name,
            slug: p.slug,
            quantity: bi.quantity,
            primaryImage: compImgMap.get(p.id) || null,
            unitPrice: p.selling_price ?? (((p as Record<string, unknown>).price as number) || 0),
          };
        })
        .filter((c): c is BundleComponentDetail => c !== null);
    }
  }

  return {
    ...catalogItem,
    addons: addonDetails,
    bundleItems,
  };
}
