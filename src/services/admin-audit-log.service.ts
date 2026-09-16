import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import {
  AdminAuditLogFilters,
  AdminAuditLogItem,
  AdminAuditLogDetail,
  AdminAuditLogListResponse,
  AuditLogActor,
} from '../types/admin-audit-log';

/**
 * Builds a brief human-readable summary from audit log action and payload.
 */
function buildAuditLogSummary(
  action: string,
  entityType: string,
  beforeData: any,
  afterData: any
): string {
  if (beforeData && afterData) {
    if (beforeData.status && afterData.status && beforeData.status !== afterData.status) {
      return `Status changed from ${beforeData.status} to ${afterData.status}`;
    }
  }

  if (afterData && typeof afterData === 'object') {
    if (afterData.status) {
      return `Status set to ${afterData.status}${afterData.note ? ` (${afterData.note})` : ''}`;
    }
    if (afterData.name) {
      return `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} "${afterData.name}"`;
    }
    if (afterData.code) {
      return `Code "${afterData.code}"`;
    }
    if (afterData.quantity_delta !== undefined) {
      const sign = Number(afterData.quantity_delta) > 0 ? '+' : '';
      return `Stock delta ${sign}${afterData.quantity_delta} (${afterData.reason || 'Manual adjustment'})`;
    }
    if (afterData.note) {
      return `Note: ${afterData.note}`;
    }
    if (afterData.email) {
      return `Target: ${afterData.email}`;
    }
  }

  // Fallback to formatted action name
  const formattedAction = action
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return `${formattedAction} on ${entityType}`;
}

/**
 * Fetches and resolves actor display profiles for a list of actor IDs.
 */
async function resolveActors(
  supabase: SupabaseClient<Database>,
  actorIds: string[]
): Promise<Map<string, AuditLogActor>> {
  const actorMap = new Map<string, AuditLogActor>();
  const uniqueIds = Array.from(new Set(actorIds.filter(Boolean)));

  if (uniqueIds.length === 0) {
    return actorMap;
  }

  // 1. Try to find customer records linked to user_ids for name and email
  const { data: customers } = await supabase
    .from('customers')
    .select('user_id, email, first_name, last_name')
    .in('user_id', uniqueIds);

  if (customers) {
    for (const c of customers) {
      if (c.user_id) {
        const fullName = [c.first_name, c.last_name].filter(Boolean).join(' ');
        actorMap.set(c.user_id, {
          id: c.user_id,
          type: 'admin',
          displayName: fullName || c.email || `Admin (${c.user_id.slice(0, 8)})`,
          email: c.email || undefined,
        });
      }
    }
  }

  // 2. For any actor IDs still unresolved, check organization_members
  const unresolved = uniqueIds.filter((id) => !actorMap.has(id));
  if (unresolved.length > 0) {
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id, role')
      .in('user_id', unresolved);

    if (members) {
      for (const m of members) {
        if (!actorMap.has(m.user_id)) {
          actorMap.set(m.user_id, {
            id: m.user_id,
            type: 'admin',
            displayName: `${m.role ? m.role.charAt(0).toUpperCase() + m.role.slice(1) : 'Admin'} (${m.user_id.slice(0, 8)})`,
          });
        }
      }
    }
  }

  // 3. Fallback for remaining IDs
  for (const id of uniqueIds) {
    if (!actorMap.has(id)) {
      actorMap.set(id, {
        id,
        type: 'admin',
        displayName: `Admin (${id.slice(0, 8)})`,
      });
    }
  }

  return actorMap;
}

/**
 * Lists, filters, and paginates audit logs for an authorized organization.
 */
export async function listAdminAuditLogs(
  supabase: SupabaseClient<Database>,
  filters: AdminAuditLogFilters
): Promise<AdminAuditLogListResponse> {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.max(1, Math.min(100, filters.limit || 25));
  const offset = (page - 1) * limit;

  // 1. Fetch organization audit logs
  let query = supabase.from('audit_logs').select('*');

  if (filters.organizationId) {
    query = query.eq('organization_id', filters.organizationId);
  }

  const { data: allLogs, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  let filtered = (allLogs || []) as Database['public']['Tables']['audit_logs']['Row'][];

  // Collect distinct actions and entity types before narrowing by filters
  const distinctActions = Array.from(new Set(filtered.map((l) => l.action).filter(Boolean))).sort();
  const distinctEntityTypes = Array.from(
    new Set(filtered.map((l) => l.entity_type).filter(Boolean))
  ).sort();

  // Multi-tenant check
  if (filters.organizationId) {
    filtered = filtered.filter((l) => l.organization_id === filters.organizationId);
  }

  // Action filter
  if (filters.action && filters.action.trim() && filters.action !== 'all') {
    const actionLower = filters.action.trim().toLowerCase();
    filtered = filtered.filter((l) => l.action?.toLowerCase() === actionLower);
  }

  // Entity type filter
  if (filters.entityType && filters.entityType.trim() && filters.entityType !== 'all') {
    const entityLower = filters.entityType.trim().toLowerCase();
    filtered = filtered.filter((l) => l.entity_type?.toLowerCase() === entityLower);
  }

  // Actor type filter (all, system, admin)
  if (filters.actorType === 'system') {
    filtered = filtered.filter((l) => !l.actor_id);
  } else if (filters.actorType === 'admin') {
    filtered = filtered.filter((l) => Boolean(l.actor_id));
  }

  // Specific Actor ID filter
  if (filters.actorId && filters.actorId.trim()) {
    const targetActorId = filters.actorId.trim();
    if (targetActorId.toLowerCase() === 'system') {
      filtered = filtered.filter((l) => !l.actor_id);
    } else {
      filtered = filtered.filter((l) => l.actor_id === targetActorId);
    }
  }

  // Date range filters
  if (filters.startDate) {
    const start = new Date(filters.startDate).toISOString();
    filtered = filtered.filter((l) => l.created_at >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate).toISOString();
    filtered = filtered.filter((l) => l.created_at <= end);
  }

  // Text search (matches entity_id, action, entity_type, or payload contents)
  if (filters.search && filters.search.trim()) {
    const searchVal = filters.search.trim().toLowerCase();
    filtered = filtered.filter((l) => {
      const matchEntityId = l.entity_id?.toLowerCase().includes(searchVal);
      const matchAction = l.action?.toLowerCase().includes(searchVal);
      const matchEntityType = l.entity_type?.toLowerCase().includes(searchVal);
      const matchActorId = l.actor_id?.toLowerCase().includes(searchVal);
      
      let matchPayload = false;
      try {
        const afterStr = l.after_data ? JSON.stringify(l.after_data).toLowerCase() : '';
        const beforeStr = l.before_data ? JSON.stringify(l.before_data).toLowerCase() : '';
        matchPayload = afterStr.includes(searchVal) || beforeStr.includes(searchVal);
      } catch {
        matchPayload = false;
      }

      return matchEntityId || matchAction || matchEntityType || matchActorId || matchPayload;
    });
  }

  // Sorting: newest-first by default
  const sortBy = filters.sortBy || 'newest';
  if (sortBy === 'oldest') {
    filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  } else {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginatedRecords = filtered.slice(offset, offset + limit);

  // Resolve actors for the paginated window
  const actorIds = paginatedRecords.map((r) => r.actor_id).filter((id): id is string => Boolean(id));
  const actorMap = await resolveActors(supabase, actorIds);

  const items: AdminAuditLogItem[] = paginatedRecords.map((record) => {
    let actor: AuditLogActor;
    if (!record.actor_id) {
      actor = {
        id: null,
        type: 'system',
        displayName: 'System',
      };
    } else {
      actor = actorMap.get(record.actor_id) || {
        id: record.actor_id,
        type: 'admin',
        displayName: `Admin (${record.actor_id.slice(0, 8)})`,
      };
    }

    return {
      id: record.id,
      organizationId: record.organization_id,
      actorId: record.actor_id,
      actor,
      action: record.action,
      entityType: record.entity_type,
      entityId: record.entity_id,
      summary: buildAuditLogSummary(record.action, record.entity_type, record.before_data, record.after_data),
      hasBeforeData: Boolean(record.before_data),
      hasAfterData: Boolean(record.after_data),
      createdAt: record.created_at,
    };
  });

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    filterOptions: {
      actions: distinctActions,
      entityTypes: distinctEntityTypes,
    },
  };
}

/**
 * Retrieves a single audit log entry by ID, scoped to the caller's organization.
 */
export async function getAdminAuditLogById(
  supabase: SupabaseClient<Database>,
  id: string,
  organizationId: string
): Promise<AdminAuditLogDetail | null> {
  const { data: record, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !record) {
    return null;
  }

  let actor: AuditLogActor;
  if (!record.actor_id) {
    actor = {
      id: null,
      type: 'system',
      displayName: 'System',
    };
  } else {
    const actorMap = await resolveActors(supabase, [record.actor_id]);
    actor = actorMap.get(record.actor_id) || {
      id: record.actor_id,
      type: 'admin',
      displayName: `Admin (${record.actor_id.slice(0, 8)})`,
    };
  }

  return {
    id: record.id,
    organizationId: record.organization_id,
    actorId: record.actor_id,
    actor,
    action: record.action,
    entityType: record.entity_type,
    entityId: record.entity_id,
    summary: buildAuditLogSummary(record.action, record.entity_type, record.before_data, record.after_data),
    hasBeforeData: Boolean(record.before_data),
    hasAfterData: Boolean(record.after_data),
    createdAt: record.created_at,
    beforeData: record.before_data,
    afterData: record.after_data,
  };
}
