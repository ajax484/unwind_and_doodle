import { z } from 'zod';
import { Json } from '../lib/supabase/types';

export const AdminAuditLogFilterSchema = z.object({
  search: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  actorType: z.enum(['all', 'admin', 'system']).optional().default('all'),
  actorId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(25),
});

export type AdminAuditLogFilters = Partial<z.input<typeof AdminAuditLogFilterSchema>> & {
  organizationId?: string;
};

export interface AuditLogActor {
  id: string | null;
  type: 'system' | 'admin';
  displayName: string;
  email?: string;
}

export interface AdminAuditLogItem {
  id: string;
  organizationId: string;
  actorId: string | null;
  actor: AuditLogActor;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  hasBeforeData: boolean;
  hasAfterData: boolean;
  createdAt: string;
}

export interface AdminAuditLogDetail extends AdminAuditLogItem {
  beforeData: Json | null;
  afterData: Json | null;
}

export interface AdminAuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  pagination: AdminAuditLogPagination;
  filterOptions: {
    actions: string[];
    entityTypes: string[];
  };
}
