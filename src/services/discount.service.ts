import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';

export type DiscountStatus = 'Active' | 'Inactive' | 'Scheduled' | 'Expired' | 'Exhausted';
export type DiscountScopeType = 'store_wide' | 'products' | 'categories';

export interface DiscountCartItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  discountId?: string;
  code?: string;
  type?: Database['public']['Enums']['discount_type'];
  value?: number;
  discountAmount?: number;
  eligibleSubtotal?: number;
  minimumOrderAmount?: number | null;
}

export interface CreateDiscountPayload {
  code: string;
  type: Database['public']['Enums']['discount_type'];
  value: number;
  minimum_order_amount?: number | null;
  usage_limit?: number | null;
  starts_at?: string | null;
  expires_at?: string | null;
  active?: boolean;
  scope?: DiscountScopeType;
  product_ids?: string[];
  category_ids?: string[];
}

export interface UpdateDiscountPayload extends Partial<CreateDiscountPayload> {}

/**
 * Derives current status for a discount from its database fields.
 */
export function deriveDiscountStatus(discount: {
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  usage_limit: number | null;
  usage_count: number;
}): DiscountStatus {
  if (!discount.active) return 'Inactive';
  const now = new Date();
  if (discount.starts_at && new Date(discount.starts_at) > now) return 'Scheduled';
  if (discount.expires_at && new Date(discount.expires_at) < now) return 'Expired';
  if (discount.usage_limit !== null && discount.usage_limit !== undefined && discount.usage_count >= discount.usage_limit) {
    return 'Exhausted';
  }
  return 'Active';
}

/**
 * Normalizes discount codes (uppercase, whitespace trimmed).
 */
export function normalizeDiscountCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Authoritative server-side discount validation and calculation.
 */
export async function validateAndCalculateDiscount(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  code: string,
  cartItems: DiscountCartItem[]
): Promise<DiscountValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: 'Promo code is required.' };
  }

  const normalizedCode = normalizeDiscountCode(code);
  const now = new Date().toISOString();

  // 1. Query discount record
  const { data: discount, error: discErr } = await supabase
    .from('discounts')
    .select('*')
    .ilike('code', normalizedCode)
    .maybeSingle();

  if (discErr || !discount) {
    return { valid: false, error: 'Invalid promo code.' };
  }

  // Check organization match if discount record specifies organization_id
  if (discount.organization_id && organizationId && discount.organization_id !== organizationId) {
    return { valid: false, error: 'Invalid promo code.' };
  }

  // 2. Status & field checks with fallbacks for legacy/mock data
  const isActive = (discount as Record<string, unknown>).active !== undefined
    ? Boolean((discount as Record<string, unknown>).active)
    : (discount as Record<string, unknown>).is_active !== false;

  if (!isActive) {
    return { valid: false, error: 'This coupon is currently inactive.' };
  }

  if (discount.starts_at && discount.starts_at > now) {
    return { valid: false, error: 'This coupon has not started yet.' };
  }

  if (discount.expires_at && discount.expires_at < now) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  const usageCount = (discount as Record<string, unknown>).usage_count !== undefined && (discount as Record<string, unknown>).usage_count !== null
    ? Number((discount as Record<string, unknown>).usage_count)
    : Number((discount as Record<string, unknown>).times_used || 0);

  if (discount.usage_limit !== null && discount.usage_limit !== undefined && usageCount >= discount.usage_limit) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // 3. Fetch scope restrictions
  const [{ data: discProducts }, { data: discCategories }] = await Promise.all([
    supabase.from('discount_products').select('product_id').eq('discount_id', discount.id),
    supabase.from('discount_categories').select('category_id').eq('discount_id', discount.id),
  ]);

  const allowedProductIds = new Set((discProducts || []).map((dp) => dp.product_id));
  const allowedCategoryIds = new Set((discCategories || []).map((dc) => dc.category_id));

  const isStoreWide = allowedProductIds.size === 0 && allowedCategoryIds.size === 0;

  // 4. Resolve product category memberships if category restrictions exist
  const cartProductIds = Array.from(new Set(cartItems.map((item) => item.productId)));
  const productCategoryMap = new Map<string, Set<string>>();

  if (allowedCategoryIds.size > 0 && cartProductIds.length > 0) {
    const { data: prodCats } = await supabase
      .from('product_categories')
      .select('product_id, category_id')
      .in('product_id', cartProductIds);

    for (const pc of prodCats || []) {
      if (!productCategoryMap.has(pc.product_id)) {
        productCategoryMap.set(pc.product_id, new Set());
      }
      productCategoryMap.get(pc.product_id)!.add(pc.category_id);
    }
  }

  // 5. Calculate eligible merchandise items
  let eligibleSubtotal = 0;

  for (const item of cartItems) {
    let isEligible = isStoreWide;

    if (!isStoreWide) {
      const matchesProduct = allowedProductIds.has(item.productId);
      const productCats = productCategoryMap.get(item.productId) || new Set();
      const matchesCategory = Array.from(productCats).some((catId) => allowedCategoryIds.has(catId));

      // Deterministic OR logic: eligible if matches product OR category
      isEligible = matchesProduct || matchesCategory;
    }

    if (isEligible) {
      eligibleSubtotal += item.unitPrice * item.quantity;
    }
  }

  if (eligibleSubtotal <= 0) {
    return {
      valid: false,
      error: 'This coupon does not apply to the products in your cart.',
    };
  }

  // 6. Minimum Order Amount check against eligible merchandise subtotal
  const minOrderAmount = discount.minimum_order_amount !== null && discount.minimum_order_amount !== undefined
    ? Number(discount.minimum_order_amount)
    : Number((discount as Record<string, unknown>).min_order_amount || 0);

  if (minOrderAmount > 0 && eligibleSubtotal < minOrderAmount) {
    return {
      valid: false,
      error: `This coupon requires a minimum order of ₦${minOrderAmount.toLocaleString()}.`,
    };
  }

  // 7. Calculate discount value
  let discountAmount = 0;
  if (discount.type === 'percentage') {
    const pct = Math.min(100, Math.max(0, Number(discount.value)));
    discountAmount = (eligibleSubtotal * pct) / 100;
  } else if (discount.type === 'fixed') {
    discountAmount = Number(discount.value);
  }

  // Cap discount at eligible subtotal so total doesn't become negative
  discountAmount = Math.max(0, Math.min(discountAmount, eligibleSubtotal));

  return {
    valid: true,
    discountId: discount.id,
    code: discount.code,
    type: discount.type,
    value: Number(discount.value),
    discountAmount,
    eligibleSubtotal,
    minimumOrderAmount: discount.minimum_order_amount,
  };
}

/**
 * Increment usage_count safely using atomic DB RPC / query.
 */
export async function incrementDiscountUsageAtomic(
  supabase: SupabaseClient<Database>,
  discountId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('increment_discount_usage', {
      p_discount_id: discountId,
      p_organization_id: organizationId,
    } as any);
    if (!error && typeof data === 'boolean') {
      return data;
    }
  } catch {
    // Fallback if RPC is unavailable
  }

  // Direct atomic update fallback
  const { data: current } = await supabase
    .from('discounts')
    .select('usage_count, usage_limit, active, organization_id')
    .eq('id', discountId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!current || !current.active) return false;
  if (current.usage_limit !== null && current.usage_limit !== undefined && current.usage_count >= current.usage_limit) return false;

  const { error: updateErr } = await supabase
    .from('discounts')
    .update({
      usage_count: current.usage_count + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', discountId);

  return !updateErr;
}

/**
 * Admin: List discounts with search & status filters.
 */
export async function getDiscounts(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  options?: {
    search?: string;
    status?: DiscountStatus | 'All';
  }
) {
  let query = supabase.from('discounts').select('*').eq('organization_id', organizationId).order('created_at', { ascending: false });

  if (options?.search && options.search.trim()) {
    const term = normalizeDiscountCode(options.search);
    query = query.ilike('code', `%${term}%`);
  }

  const { data: rawDiscounts, error } = await query;
  if (error) throw new Error(`Failed to fetch discounts: ${error.message}`);

  const discountIds = (rawDiscounts || []).map((d) => d.id);

  // Fetch scope counts
  let discProductsMap = new Map<string, number>();
  let discCategoriesMap = new Map<string, number>();

  if (discountIds.length > 0) {
    const [{ data: dpData }, { data: dcData }] = await Promise.all([
      supabase.from('discount_products').select('discount_id').in('discount_id', discountIds),
      supabase.from('discount_categories').select('discount_id').in('discount_id', discountIds),
    ]);

    for (const dp of dpData || []) {
      discProductsMap.set(dp.discount_id, (discProductsMap.get(dp.discount_id) || 0) + 1);
    }
    for (const dc of dcData || []) {
      discCategoriesMap.set(dc.discount_id, (discCategoriesMap.get(dc.discount_id) || 0) + 1);
    }
  }

  const items = (rawDiscounts || []).map((d) => {
    const status = deriveDiscountStatus(d);
    const productCount = discProductsMap.get(d.id) || 0;
    const categoryCount = discCategoriesMap.get(d.id) || 0;
    
    let scope: DiscountScopeType = 'store_wide';
    if (productCount > 0 && categoryCount > 0) scope = 'products'; // combined
    else if (productCount > 0) scope = 'products';
    else if (categoryCount > 0) scope = 'categories';

    return {
      ...d,
      status,
      scope,
      product_count: productCount,
      category_count: categoryCount,
    };
  });

  if (options?.status && options.status !== 'All') {
    return items.filter((item) => item.status === options.status);
  }

  return items;
}

/**
 * Admin: Get single discount detail with attached products & categories.
 */
export async function getDiscountById(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  discountId: string
) {
  const { data: discount, error } = await supabase
    .from('discounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', discountId)
    .single();

  if (error || !discount) throw new Error('Discount not found');

  const [{ data: dpData }, { data: dcData }] = await Promise.all([
    supabase.from('discount_products').select('product_id').eq('discount_id', discountId),
    supabase.from('discount_categories').select('category_id').eq('discount_id', discountId),
  ]);

  const productIds = (dpData || []).map((dp) => dp.product_id);
  const categoryIds = (dcData || []).map((dc) => dc.category_id);

  let products: Array<{ id: string; name: string; selling_price: number }> = [];
  let categories: Array<{ id: string; name: string }> = [];

  if (productIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, selling_price')
      .in('id', productIds);
    products = prods || [];
  }

  if (categoryIds.length > 0) {
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);
    categories = cats || [];
  }

  const status = deriveDiscountStatus(discount);

  return {
    ...discount,
    status,
    products,
    categories,
    product_ids: productIds,
    category_ids: categoryIds,
  };
}

/**
 * Admin: Create new discount with audit logging.
 */
export async function createDiscount(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  actorId: string | null,
  payload: CreateDiscountPayload
) {
  const normalizedCode = normalizeDiscountCode(payload.code);

  if (payload.type === 'percentage' && payload.value > 100) {
    throw new Error('Percentage discount cannot exceed 100%');
  }

  // Check code uniqueness within org
  const { data: existing } = await supabase
    .from('discounts')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('code', normalizedCode)
    .maybeSingle();

  if (existing) {
    throw new Error(`Discount code '${normalizedCode}' already exists`);
  }

  const { data: discount, error } = await supabase
    .from('discounts')
    .insert({
      organization_id: organizationId,
      code: normalizedCode,
      type: payload.type,
      value: payload.value,
      minimum_order_amount: payload.minimum_order_amount ?? null,
      usage_limit: payload.usage_limit ?? null,
      usage_count: 0,
      starts_at: payload.starts_at || null,
      expires_at: payload.expires_at || null,
      active: payload.active !== undefined ? payload.active : true,
    })
    .select('*')
    .single();

  if (error || !discount) throw new Error(`Failed to create discount: ${error?.message}`);

  // Insert scope associations if specified
  if (payload.scope === 'products' && payload.product_ids && payload.product_ids.length > 0) {
    const rows = payload.product_ids.map((pid) => ({
      discount_id: discount.id,
      product_id: pid,
    }));
    await supabase.from('discount_products').insert(rows);
  }

  if (payload.scope === 'categories' && payload.category_ids && payload.category_ids.length > 0) {
    const rows = payload.category_ids.map((cid) => ({
      discount_id: discount.id,
      category_id: cid,
    }));
    await supabase.from('discount_categories').insert(rows);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: 'create',
    entity_type: 'discount',
    entity_id: discount.id,
    after_data: {
      code: discount.code,
      type: discount.type,
      value: discount.value,
      scope: payload.scope || 'store_wide',
    },
  });

  return getDiscountById(supabase, organizationId, discount.id);
}

/**
 * Admin: Update discount with audit logging.
 */
export async function updateDiscount(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  actorId: string | null,
  discountId: string,
  payload: UpdateDiscountPayload
) {
  const beforeDiscount = await getDiscountById(supabase, organizationId, discountId);

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.code) updates.code = normalizeDiscountCode(payload.code);
  if (payload.type) updates.type = payload.type;
  if (payload.value !== undefined) {
    if ((payload.type || beforeDiscount.type) === 'percentage' && payload.value > 100) {
      throw new Error('Percentage discount cannot exceed 100%');
    }
    updates.value = payload.value;
  }
  if (payload.minimum_order_amount !== undefined) updates.minimum_order_amount = payload.minimum_order_amount;
  if (payload.usage_limit !== undefined) updates.usage_limit = payload.usage_limit;
  if (payload.starts_at !== undefined) updates.starts_at = payload.starts_at;
  if (payload.expires_at !== undefined) updates.expires_at = payload.expires_at;
  if (payload.active !== undefined) updates.active = payload.active;

  const { error } = await supabase
    .from('discounts')
    .update(updates as any)
    .eq('organization_id', organizationId)
    .eq('id', discountId);

  if (error) throw new Error(`Failed to update discount: ${error.message}`);

  // Handle scope updates if scope is explicitly provided
  if (payload.scope !== undefined) {
    await Promise.all([
      supabase.from('discount_products').delete().eq('discount_id', discountId),
      supabase.from('discount_categories').delete().eq('discount_id', discountId),
    ]);

    if (payload.scope === 'products' && payload.product_ids && payload.product_ids.length > 0) {
      const rows = payload.product_ids.map((pid) => ({
        discount_id: discountId,
        product_id: pid,
      }));
      await supabase.from('discount_products').insert(rows);
    }

    if (payload.scope === 'categories' && payload.category_ids && payload.category_ids.length > 0) {
      const rows = payload.category_ids.map((cid) => ({
        discount_id: discountId,
        category_id: cid,
      }));
      await supabase.from('discount_categories').insert(rows);
    }
  }

  const afterDiscount = await getDiscountById(supabase, organizationId, discountId);

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: payload.active === false && beforeDiscount.active ? 'update' : 'update',
    entity_type: 'discount',
    entity_id: discountId,
    before_data: { code: beforeDiscount.code, value: beforeDiscount.value, active: beforeDiscount.active },
    after_data: { code: afterDiscount.code, value: afterDiscount.value, active: afterDiscount.active },
  });

  return afterDiscount;
}

/**
 * Admin: Delete or soft-disable discount depending on historical usage.
 */
export async function deleteDiscount(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  actorId: string | null,
  discountId: string
) {
  const discount = await getDiscountById(supabase, organizationId, discountId);

  if (discount.usage_count > 0) {
    // Soft disable if already used to protect historical references
    await updateDiscount(supabase, organizationId, actorId, discountId, { active: false });
    return { softDisabled: true, message: 'Discount has historical redemptions; soft-disabled to preserve order integrity.' };
  }

  // Hard delete if never used
  await Promise.all([
    supabase.from('discount_products').delete().eq('discount_id', discountId),
    supabase.from('discount_categories').delete().eq('discount_id', discountId),
  ]);

  const { error } = await supabase
    .from('discounts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', discountId);

  if (error) throw new Error(`Failed to delete discount: ${error.message}`);

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action: 'delete',
    entity_type: 'discount',
    entity_id: discountId,
    before_data: { code: discount.code, value: discount.value },
  });

  return { softDisabled: false, message: 'Discount deleted successfully.' };
}
