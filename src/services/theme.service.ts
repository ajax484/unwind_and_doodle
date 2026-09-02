import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import {
  Theme,
  PublicTheme,
  CreateThemeInput,
  UpdateThemeInput,
  ReorderThemesInput,
  CreateThemeSchema,
  UpdateThemeSchema,
  ReorderThemesSchema,
  AssignProductThemesSchema,
} from '../types/admin-theme';

/**
 * Lists all themes for an organization (admin view).
 */
export async function listOrganizationThemes(
  supabase: SupabaseClient<Database>,
  orgId?: string
): Promise<Theme[]> {
  let query = supabase.from('themes').select('*');
  if (orgId) {
    if (typeof (query as any).or === 'function') {
      query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
    } else {
      query = query.eq('organization_id', orgId);
    }
  }

  let orderedQuery = query;
  if (typeof (orderedQuery as any).order === 'function') {
    orderedQuery = orderedQuery
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
  }

  const { data, error } = await orderedQuery;

  if (error) {
    throw new Error(`Failed to list organization themes: ${error.message}`);
  }

  return (data || []).map((t) => ({
    id: t.id,
    organizationId: t.organization_id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    storagePath: t.storage_path,
    isActive: t.is_active,
    sortOrder: t.sort_order,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/**
 * Creates a new theme for an organization.
 */
export async function createTheme(
  supabase: SupabaseClient<Database>,
  orgId: string,
  input: CreateThemeInput
): Promise<Theme> {
  if (!orgId) {
    throw new Error('Organization ID is required to create a theme.');
  }

  const validated = CreateThemeSchema.parse(input);

  const finalSlug = validated.slug && validated.slug.trim() !== ''
    ? slugify(validated.slug)
    : slugify(validated.name);

  if (!finalSlug) {
    throw new Error('Theme slug cannot be empty.');
  }

  // Check unique slug for organization
  const { data: existing } = await supabase
    .from('themes')
    .select('id')
    .eq('organization_id', orgId)
    .eq('slug', finalSlug)
    .maybeSingle();

  if (existing) {
    throw new Error(`A theme with slug "${finalSlug}" already exists for this organization.`);
  }

  // Call RPC create_admin_theme first
  const { data: themeId, error: rpcErr } = await supabase.rpc('create_admin_theme' as any, {
    p_org_id: orgId,
    p_name: validated.name,
    p_slug: finalSlug,
    p_description: validated.description ?? null,
    p_storage_path: validated.storagePath ?? null,
    p_is_active: validated.isActive,
    p_sort_order: validated.sortOrder,
  });

  if (rpcErr || !themeId) {
    // Fallback direct table insert if RPC fails or not in schema cache
    const { data: inserted, error: insertErr } = await supabase
      .from('themes')
      .insert({
        organization_id: orgId,
        name: validated.name,
        slug: finalSlug,
        description: validated.description ?? null,
        storage_path: validated.storagePath ?? null,
        is_active: validated.isActive,
        sort_order: validated.sortOrder,
      })
      .select('*')
      .maybeSingle();

    if (insertErr || !inserted) {
      throw new Error(`Failed to create theme: ${rpcErr?.message || insertErr?.message || 'Database insert error'}`);
    }

    return {
      id: inserted.id,
      organizationId: inserted.organization_id,
      name: inserted.name,
      slug: inserted.slug,
      description: inserted.description,
      storagePath: inserted.storage_path,
      isActive: inserted.is_active,
      sortOrder: inserted.sort_order,
      createdAt: inserted.created_at,
      updatedAt: inserted.updated_at,
    };
  }

  const { data: created, error: getErr } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId as string)
    .single();

  if (getErr || !created) {
    throw new Error(`Failed to fetch created theme: ${getErr?.message}`);
  }

  return {
    id: created.id,
    organizationId: created.organization_id,
    name: created.name,
    slug: created.slug,
    description: created.description,
    storagePath: created.storage_path,
    isActive: created.is_active,
    sortOrder: created.sort_order,
    createdAt: created.created_at,
    updatedAt: created.updated_at,
  };
}

/**
 * Updates an existing theme.
 */
export async function updateTheme(
  supabase: SupabaseClient<Database>,
  orgId: string,
  themeId: string,
  input: UpdateThemeInput
): Promise<Theme> {
  const validated = UpdateThemeSchema.parse(input);

  const { data: theme } = await supabase
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!theme) {
    throw new Error(`Theme ${themeId} does not exist for this organization.`);
  }

  if (validated.slug && validated.slug !== theme.slug) {
    const { data: existing } = await supabase
      .from('themes')
      .select('id')
      .eq('organization_id', orgId)
      .eq('slug', validated.slug)
      .neq('id', themeId)
      .maybeSingle();

    if (existing) {
      throw new Error(`A theme with slug "${validated.slug}" already exists for this organization.`);
    }
  }

  const updateData: Database['public']['Tables']['themes']['Update'] = {
    updated_at: new Date().toISOString(),
  };

  if (validated.name !== undefined) updateData.name = validated.name;
  if (validated.slug) updateData.slug = validated.slug;
  if (validated.description !== undefined) updateData.description = validated.description;
  if (validated.storagePath !== undefined) updateData.storage_path = validated.storagePath;
  if (validated.isActive !== undefined) updateData.is_active = validated.isActive;
  if (validated.sortOrder !== undefined) updateData.sort_order = validated.sortOrder;

  const { data: updated, error } = await supabase
    .from('themes')
    .update(updateData)
    .eq('id', themeId)
    .eq('organization_id', orgId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(`Failed to update theme: ${error?.message}`);
  }

  return {
    id: updated.id,
    organizationId: updated.organization_id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description,
    storagePath: updated.storage_path,
    isActive: updated.is_active,
    sortOrder: updated.sort_order,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  };
}

/**
 * Toggles a theme active status.
 */
export async function toggleThemeActive(
  supabase: SupabaseClient<Database>,
  orgId: string,
  themeId: string,
  isActive: boolean
): Promise<boolean> {
  const { error } = await supabase
    .from('themes')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', themeId)
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(`Failed to toggle theme active status: ${error.message}`);
  }

  return true;
}

/**
 * Reorders themes for an organization.
 */
export async function reorderThemes(
  supabase: SupabaseClient<Database>,
  orgId: string,
  themeOrders: ReorderThemesInput
): Promise<boolean> {
  const validated = ReorderThemesSchema.parse(themeOrders);

  for (const item of validated) {
    const { error } = await supabase
      .from('themes')
      .update({ sort_order: item.sortOrder, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(`Failed to reorder theme ${item.id}: ${error.message}`);
    }
  }

  return true;
}

/**
 * Deletes a theme for an organization where safe.
 */
export async function deleteTheme(
  supabase: SupabaseClient<Database>,
  orgId: string,
  themeId: string
): Promise<boolean> {
  const { data: theme } = await supabase
    .from('themes')
    .select('id')
    .eq('id', themeId)
    .eq('organization_id', orgId)
    .maybeSingle();

  if (!theme) {
    throw new Error(`Theme ${themeId} does not exist for this organization.`);
  }

  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', themeId)
    .eq('organization_id', orgId);

  if (error) {
    throw new Error(`Failed to delete theme: ${error.message}`);
  }

  return true;
}

/**
 * Assigns themes to a product.
 * Verifies product and themes belong to the same organization and themes are active.
 */
export async function assignThemesToProduct(
  supabase: SupabaseClient<Database>,
  orgId: string,
  productId: string,
  themeIds: string[]
): Promise<boolean> {
  const validated = AssignProductThemesSchema.parse({ themeIds });

  // 1. Verify product ownership
  const { data: product } = await supabase
    .from('products')
    .select('id, organization_id')
    .eq('id', productId)
    .maybeSingle();

  if (!product || product.organization_id !== orgId) {
    throw new Error(`Product ${productId} does not belong to organization ${orgId}`);
  }

  // 2. Verify all themes belong to org and are active
  if (validated.themeIds.length > 0) {
    const { data: themes } = await supabase
      .from('themes')
      .select('id, organization_id, is_active')
      .in('id', validated.themeIds);

    const themeMap = new Map((themes || []).map((t) => [t.id, t]));

    for (const tid of validated.themeIds) {
      const theme = themeMap.get(tid);
      if (!theme || theme.organization_id !== orgId) {
        throw new Error(`Theme ${tid} does not belong to organization ${orgId}`);
      }
      if (!theme.is_active) {
        throw new Error(`Theme ${tid} is inactive and cannot be assigned to new product options.`);
      }
    }
  }

  // 3. Atomic replacement
  const { error: delErr } = await supabase
    .from('product_themes')
    .delete()
    .eq('product_id', productId);

  if (delErr) {
    throw new Error(`Failed to clear product themes: ${delErr.message}`);
  }

  if (validated.themeIds.length > 0) {
    const uniqueIds = Array.from(new Set(validated.themeIds));
    const insertPayload = uniqueIds.map((tid) => ({
      product_id: productId,
      theme_id: tid,
    }));

    const { error: insErr } = await supabase
      .from('product_themes')
      .insert(insertPayload);

    if (insErr) {
      throw new Error(`Failed to assign product themes: ${insErr.message}`);
    }
  }

  // Also set supports_theme_customization capability flag if themes are assigned
  await supabase
    .from('products')
    .update({ supports_theme_customization: validated.themeIds.length > 0 })
    .eq('id', productId);

  return true;
}

/**
 * Retrieves themes assigned to a product for admin view.
 */
export async function getProductThemes(
  supabase: SupabaseClient<Database>,
  orgId: string,
  productId: string
): Promise<Theme[]> {
  const { data: product } = await supabase
    .from('products')
    .select('id, organization_id')
    .eq('id', productId)
    .maybeSingle();

  if (!product || product.organization_id !== orgId) {
    throw new Error(`Product ${productId} does not belong to organization ${orgId}`);
  }

  const { data: assignments } = await supabase
    .from('product_themes')
    .select('theme_id')
    .eq('product_id', productId);

  if (!assignments || assignments.length === 0) {
    return [];
  }

  const themeIds = assignments.map((a) => a.theme_id);
  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .in('id', themeIds)
    .eq('organization_id', orgId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch product themes: ${error.message}`);
  }

  return (themes || []).map((t) => ({
    id: t.id,
    organizationId: t.organization_id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    storagePath: t.storage_path,
    isActive: t.is_active,
    sortOrder: t.sort_order,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));
}

/**
 * Retrieves active themes assigned to a product for storefront customer view.
 * Returns only active themes assigned to the requested product, ordered by sort_order.
 */
export async function getPublicProductThemes(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<PublicTheme[]> {
  const { data: assignments, error: assignErr } = await supabase
    .from('product_themes')
    .select('theme_id')
    .eq('product_id', productId);

  if (assignErr || !assignments || assignments.length === 0) {
    return [];
  }

  const themeIds = assignments.map((a) => a.theme_id);

  const { data: themes, error: themeErr } = await supabase
    .from('themes')
    .select('id, name, description, storage_path, sort_order')
    .in('id', themeIds)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (themeErr) {
    throw new Error(`Failed to fetch storefront product themes: ${themeErr.message}`);
  }

  return (themes || []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    storagePath: t.storage_path,
    sortOrder: t.sort_order,
  }));
}

export interface ValidatedThemeCustomization {
  selectedThemeIds: string[];
  coverName: string | null;
  themes: {
    id: string;
    name: string;
    sortOrder: number;
  }[];
}

/**
 * Validates theme customization requirements server-side.
 */
export async function validateThemeCustomization(
  supabase: SupabaseClient<Database>,
  orgId: string,
  productId: string,
  input?: { selectedThemeIds?: string[]; coverName?: string } | null
): Promise<ValidatedThemeCustomization | null> {
  const { data: product } = await supabase
    .from('products')
    .select('id, organization_id, supports_theme_customization')
    .eq('id', productId)
    .maybeSingle();

  if (!product) {
    throw new Error(`Product ${productId} not found.`);
  }

  const supportsCustomization = Boolean(product.supports_theme_customization);

  if (!input || !input.selectedThemeIds || input.selectedThemeIds.length === 0) {
    if (supportsCustomization) {
      throw new Error(`Product requires theme customization (between 1 and 3 themes).`);
    }
    return null;
  }

  if (!supportsCustomization) {
    throw new Error(`Product ${productId} does not support theme customization.`);
  }

  const themeIds = input.selectedThemeIds;

  // 1. Verify count 1-3
  if (themeIds.length < 1 || themeIds.length > 3) {
    throw new Error(`Theme selection must contain between 1 and 3 themes.`);
  }

  // 2. Verify no duplicates
  if (new Set(themeIds).size !== themeIds.length) {
    throw new Error(`Duplicate theme selections are not allowed.`);
  }

  // 3. Verify cover name if provided
  let trimmedCover: string | null = null;
  if (input.coverName !== undefined && input.coverName !== null) {
    const rawCover = input.coverName;
    trimmedCover = rawCover.trim();
    if (rawCover.length > 0 && trimmedCover.length === 0) {
      throw new Error(`Cover name cannot be empty or whitespace only.`);
    }
    if (trimmedCover.length > 100) {
      throw new Error(`Cover name must be 100 characters or less.`);
    }
    if (trimmedCover.length === 0) {
      trimmedCover = null;
    }
  }

  // 4. Verify themes assigned to product
  const { data: productThemes } = await supabase
    .from('product_themes')
    .select('theme_id')
    .eq('product_id', productId);

  const assignedSet = new Set((productThemes || []).map((pt) => pt.theme_id));

  for (const tid of themeIds) {
    if (!assignedSet.has(tid)) {
      throw new Error(`Theme ${tid} is not assigned to product ${productId}.`);
    }
  }

  // 5. Verify themes belong to same org and are active
  const { data: themeRecords } = await supabase
    .from('themes')
    .select('id, name, organization_id, is_active, sort_order')
    .in('id', themeIds);

  const themeMap = new Map((themeRecords || []).map((t) => [t.id, t]));

  const resolvedThemes: { id: string; name: string; sortOrder: number }[] = [];

  for (const tid of themeIds) {
    const theme = themeMap.get(tid);
    if (!theme) {
      throw new Error(`Theme ${tid} not found.`);
    }
    if (theme.organization_id !== orgId && theme.organization_id !== product.organization_id) {
      throw new Error(`Theme ${tid} belongs to another organization.`);
    }
    if (!theme.is_active) {
      throw new Error(`Theme "${theme.name}" is inactive.`);
    }

    resolvedThemes.push({
      id: theme.id,
      name: theme.name,
      sortOrder: theme.sort_order,
    });
  }

  return {
    selectedThemeIds: themeIds,
    coverName: trimmedCover,
    themes: resolvedThemes,
  };
}

/**
 * Atomically persists theme customization details and denormalized snapshots for an order item.
 */
export async function persistThemeCustomizationSnapshot(
  supabase: SupabaseClient<Database>,
  orderItemId: string,
  customization: ValidatedThemeCustomization
): Promise<string> {
  const { data: custRecord, error: custErr } = await supabase
    .from('order_item_theme_customizations')
    .insert({
      order_item_id: orderItemId,
      cover_name: customization.coverName,
    })
    .select('id')
    .single();

  if (custErr || !custRecord) {
    throw new Error(`Failed to persist order item theme customization: ${custErr?.message}`);
  }

  const snapshotInserts = customization.themes.map((t) => ({
    customization_id: custRecord.id,
    theme_id: t.id,
    theme_name: t.name,
    sort_order: t.sortOrder,
  }));

  const { error: snapErr } = await supabase
    .from('order_item_theme_snapshots')
    .insert(snapshotInserts);

  if (snapErr) {
    throw new Error(`Failed to persist order item theme snapshot: ${snapErr.message}`);
  }

  return custRecord.id;
}
