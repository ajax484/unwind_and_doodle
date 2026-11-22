import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/constants';
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageConfig,
  HomepageConfigSchema,
  HomepageSettingsRecord,
  normalizeHomepageConfig,
} from '@/types/homepage-settings';

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

export async function getHomepageSettings(
  supabase: SupabaseClient<Database>,
  organizationId?: string
): Promise<HomepageSettingsRecord> {
  const orgId = await resolveOrganizationId(supabase, organizationId);

  try {
    const { data, error } = await (supabase as any)
      .from('homepage_settings')
      .select('config, updated_at')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (error || !data) {
      return {
        config: DEFAULT_HOMEPAGE_CONFIG,
        updatedAt: null,
        isDefault: true,
      };
    }

    return {
      config: normalizeHomepageConfig(data.config),
      updatedAt: data.updated_at || null,
      isDefault: false,
    };
  } catch {
    return {
      config: DEFAULT_HOMEPAGE_CONFIG,
      updatedAt: null,
      isDefault: true,
    };
  }
}

export async function upsertHomepageSettings(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  input: HomepageConfig,
  actorId?: string | null
): Promise<HomepageSettingsRecord> {
  const parsed = HomepageConfigSchema.parse(input);
  const normalized = normalizeHomepageConfig(parsed);
  const nowIso = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from('homepage_settings')
    .upsert(
      {
        organization_id: organizationId,
        config: normalized,
        updated_by: actorId || null,
        updated_at: nowIso,
      },
      { onConflict: 'organization_id' }
    )
    .select('id, config, updated_at')
    .single();

  if (error || !data) {
    throw new Error(`Failed to save homepage settings: ${error?.message || 'Unknown error'}`);
  }

  try {
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: actorId || null,
      action: 'update',
      entity_type: 'homepage_settings',
      entity_id: data.id,
      after_data: {
        sectionOrder: normalized.sections.map((s) => `${s.key}:${s.enabled ? 'on' : 'off'}`),
      },
      new_values: {
        sectionOrder: normalized.sections.map((s) => `${s.key}:${s.enabled ? 'on' : 'off'}`),
      },
    } as Database['public']['Tables']['audit_logs']['Insert']);
  } catch {
    // Non-blocking audit log
  }

  return {
    config: normalizeHomepageConfig(data.config),
    updatedAt: data.updated_at || nowIso,
    isDefault: false,
  };
}
