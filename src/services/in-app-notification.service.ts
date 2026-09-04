import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import {
  InAppNotification,
  CreateInAppNotificationInput,
  NotificationListResponse,
  NotificationRecipientType,
} from '../types/notification';

const DEFAULT_ORG_ID = '88c7af2e-afd4-4504-a43f-b14cc45d6263';

function mapRowToNotification(row: any): InAppNotification {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    title: row.title,
    message: row.message,
    type: row.type,
    category: row.category,
    link: row.link,
    metadata: row.metadata || null,
    readAt: row.read_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Creates and persists a new in-app notification in the database.
 */
export async function createInAppNotification(
  supabase: SupabaseClient<Database>,
  input: CreateInAppNotificationInput
): Promise<InAppNotification> {
  const orgId = input.organizationId || DEFAULT_ORG_ID;

  const payload = {
    organization_id: orgId,
    recipient_type: input.recipientType,
    recipient_id: input.recipientId || null,
    title: input.title,
    message: input.message,
    type: input.type || 'info',
    category: input.category || 'system',
    link: input.link || null,
    metadata: input.metadata || {},
    read_at: null,
  };

  const { data, error } = await (supabase as any)
    .from('notifications')
    .insert(payload)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create in-app notification');
  }

  return mapRowToNotification(data);
}

/**
 * Retrieves notifications for a given recipient (customer or admin) with unread count.
 */
export async function getInAppNotifications(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId?: string;
    recipientType: NotificationRecipientType;
    recipientId?: string | null;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<NotificationListResponse> {
  const orgId = params.organizationId || DEFAULT_ORG_ID;
  const limit = params.limit || 20;
  const offset = params.offset || 0;

  // 1. Fetch unread count
  let unreadQuery = (supabase as any)
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('read_at', null);

  if (params.recipientType === 'customer') {
    unreadQuery = unreadQuery
      .eq('recipient_type', 'customer')
      .eq('recipient_id', params.recipientId || '');
  } else if (params.recipientType === 'admin') {
    unreadQuery = unreadQuery.in('recipient_type', ['admin', 'broadcast']);
  }

  const { count: unreadCount } = await unreadQuery;

  // 2. Fetch notifications list
  let listQuery = (supabase as any)
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('organization_id', orgId);

  if (params.recipientType === 'customer') {
    listQuery = listQuery
      .eq('recipient_type', 'customer')
      .eq('recipient_id', params.recipientId || '');
  } else if (params.recipientType === 'admin') {
    listQuery = listQuery.in('recipient_type', ['admin', 'broadcast']);
  }

  if (params.unreadOnly) {
    listQuery = listQuery.is('read_at', null);
  }

  const { data, count, error } = await listQuery
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message || 'Failed to query notifications');
  }

  const items = (data || []).map(mapRowToNotification);

  return {
    notifications: items,
    unreadCount: unreadCount !== undefined && unreadCount !== null ? unreadCount : 0,
    total: typeof count === 'number' && count > 0 ? count : items.length,
  };
}

/**
 * Marks a single notification as read.
 */
export async function markInAppNotificationRead(
  supabase: SupabaseClient<Database>,
  notificationId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  const { error } = await (supabase as any)
    .from('notifications')
    .update({
      read_at: now,
      updated_at: now,
    })
    .eq('id', notificationId);

  if (error) {
    throw new Error(error.message || 'Failed to mark notification as read');
  }

  return true;
}

/**
 * Marks all pending unread notifications as read for a recipient.
 */
export async function markAllInAppNotificationsRead(
  supabase: SupabaseClient<Database>,
  params: {
    organizationId?: string;
    recipientType: NotificationRecipientType;
    recipientId?: string | null;
  }
): Promise<boolean> {
  const orgId = params.organizationId || DEFAULT_ORG_ID;
  const now = new Date().toISOString();

  let query = (supabase as any)
    .from('notifications')
    .update({
      read_at: now,
      updated_at: now,
    })
    .eq('organization_id', orgId)
    .is('read_at', null);

  if (params.recipientType === 'customer') {
    query = query
      .eq('recipient_type', 'customer')
      .eq('recipient_id', params.recipientId || '');
  } else if (params.recipientType === 'admin') {
    query = query.in('recipient_type', ['admin', 'broadcast']);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message || 'Failed to mark all notifications as read');
  }

  return true;
}
