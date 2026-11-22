import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants';
import {
  DEFAULT_STOREFRONT_PAGES,
  STOREFRONT_PAGE_SLUGS,
  StorefrontPageContent,
  StorefrontPageContentSchema,
  StorefrontPageRecord,
  StorefrontPageSlug,
  UpdateStorefrontPageInput,
  UpdateStorefrontPageSchema,
} from '@/types/storefront-pages';

async function resolveOrganizationId(
  supabase: SupabaseClient<Database>,
  organizationId?: string
): Promise<string> {
  if (organizationId?.trim()) return organizationId.trim();
  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (org?.id) return org.id;
  } catch {
    // Fallback to default
  }
  return DEFAULT_ORGANIZATION_ID;
}

function mapRowToPage(slug: StorefrontPageSlug, row: any | null): StorefrontPageRecord {
  const fallback = DEFAULT_STOREFRONT_PAGES[slug];
  if (!row) {
    return {
      ...fallback,
      updatedAt: null,
      isDefault: true,
    };
  }

  const parsedContent = StorefrontPageContentSchema.safeParse(row.content);
  const content: StorefrontPageContent = parsedContent.success
    ? parsedContent.data
    : fallback.content;

  return {
    slug,
    title: row.title || fallback.title,
    subtitle: row.subtitle ?? fallback.subtitle,
    content,
    seoTitle: row.seo_title ?? fallback.seoTitle,
    seoDescription: row.seo_description ?? fallback.seoDescription,
    updatedAt: row.updated_at || null,
    isDefault: false,
  };
}

/**
 * Retrieves a single storefront CMS page by slug, falling back cleanly to default placeholder content.
 */
export async function getStorefrontPage(
  supabase: SupabaseClient<Database>,
  slug: StorefrontPageSlug,
  organizationId?: string
): Promise<StorefrontPageRecord> {
  const orgId = await resolveOrganizationId(supabase, organizationId);

  try {
    const { data, error } = await (supabase as any)
      .from('storefront_pages')
      .select('*')
      .eq('organization_id', orgId)
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      return mapRowToPage(slug, null);
    }

    return mapRowToPage(slug, data);
  } catch {
    return mapRowToPage(slug, null);
  }
}

/**
 * Lists all 5 canonical storefront pages for an organization (DB rows merged with defaults).
 */
export async function listStorefrontPages(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<StorefrontPageRecord[]> {
  const rowMap = new Map<string, any>();

  try {
    const { data } = await (supabase as any)
      .from('storefront_pages')
      .select('*')
      .eq('organization_id', organizationId);

    for (const row of data || []) {
      if (row?.slug) rowMap.set(row.slug, row);
    }
  } catch {
    // Fallback to defaults if table is not yet migrated
  }

  return STOREFRONT_PAGE_SLUGS.map((slug) => mapRowToPage(slug, rowMap.get(slug) || null));
}

/**
 * Validates and upserts a storefront CMS page for an organization.
 */
export async function upsertStorefrontPage(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  slug: StorefrontPageSlug,
  input: UpdateStorefrontPageInput,
  actorId?: string | null
): Promise<StorefrontPageRecord> {
  const parsed = UpdateStorefrontPageSchema.parse(input);
  const nowIso = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from('storefront_pages')
    .upsert(
      {
        organization_id: organizationId,
        slug,
        title: parsed.title,
        subtitle: parsed.subtitle ?? null,
        content: parsed.content,
        seo_title: parsed.seoTitle ?? null,
        seo_description: parsed.seoDescription ?? null,
        updated_by: actorId || null,
        updated_at: nowIso,
      },
      { onConflict: 'organization_id,slug' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save storefront page "${slug}": ${error?.message || 'Unknown error'}`);
  }

  // Non-blocking audit log
  try {
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: actorId || null,
      action: 'update',
      entity_type: 'storefront_page',
      entity_id: data.id,
      after_data: { slug, title: parsed.title },
      new_values: { slug, title: parsed.title },
    } as Database['public']['Tables']['audit_logs']['Insert']);
  } catch {
    // Non-blocking
  }

  return mapRowToPage(slug, data);
}
