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
