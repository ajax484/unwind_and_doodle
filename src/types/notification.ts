export type NotificationRecipientType = 'customer' | 'admin' | 'broadcast';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export type NotificationCategory =
  | 'order'
  | 'inventory'
  | 'review'
  | 'customization'
  | 'stock'
  | 'system';

export interface InAppNotification {
  id: string;
  organizationId: string;
  recipientType: NotificationRecipientType;
  recipientId: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link: string | null;
  metadata?: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInAppNotificationInput {
  organizationId?: string;
  recipientType: NotificationRecipientType;
  recipientId?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResponse {
  notifications: InAppNotification[];
  unreadCount: number;
  total: number;
}

export interface NotificationRow {
  id: string;
  organization_id: string;
  recipient_type: NotificationRecipientType;
  recipient_id: string | null;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationInsert {
  id?: string;
  organization_id: string;
  recipient_type: NotificationRecipientType;
  recipient_id?: string | null;
  title: string;
  message: string;
  type?: NotificationType;
  category?: NotificationCategory;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationUpdate {
  id?: string;
  organization_id?: string;
  recipient_type?: NotificationRecipientType;
  recipient_id?: string | null;
  title?: string;
  message?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

