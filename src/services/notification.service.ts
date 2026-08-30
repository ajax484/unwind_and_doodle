import { registerDomainEventHandler } from './events.service';
import { generateOrderAccessToken } from '../lib/order-token';
import { getConfig } from '../lib/config';

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  template: 'order_confirmation' | 'order_shipped' | 'review_request' | 'stock_alert';
  data: Record<string, unknown>;
}

// In-memory audit/sent register for idempotency in runtime session
const sentNotifications = new Set<string>();

/**
 * Dispatches an asynchronous transactional notification.
 * Integrates with email/SMS/WhatsApp infrastructure without coupling to the DB transaction.
 */
export async function dispatchTransactionalEmail(
  payload: EmailNotificationPayload,
  idempotencyKey?: string
): Promise<{ success: boolean; messageId: string }> {
  if (idempotencyKey && sentNotifications.has(idempotencyKey)) {
    console.info(`[notification.idempotent_skip] key=${idempotencyKey}`);
    return { success: true, messageId: `cached_${idempotencyKey}` };
  }

  // Simulated email dispatch log (can be wired to Resend/SendGrid/Postmark/AWS SES via config)
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.info(
    `[notification.email_dispatched] to=${payload.to} template=${payload.template} subject="${payload.subject}" messageId=${messageId}`
  );

  if (idempotencyKey) {
    sentNotifications.add(idempotencyKey);
  }

  return { success: true, messageId };
}

/**
 * Initializes and registers domain event handlers for post-purchase lifecycle notifications.
 */
export function initializeNotificationEventHandlers(): void {
  const { appUrl } = getConfig();

  // 1. Order Confirmation (on order.pending or payment.completed)
  registerDomainEventHandler('order.pending', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || (payload.order_number as string) || event.aggregateId;
    const email = (payload.email as string) || (payload.customerEmail as string);

    if (!email) return;

    const accessToken = generateOrderAccessToken(orderNumber, email);
    const trackingUrl = `${appUrl}/order/${orderNumber}?token=${accessToken}`;

    await dispatchTransactionalEmail(
      {
        to: email,
        subject: `Order Confirmed: #${orderNumber} — Unwind and Doodle`,
        template: 'order_confirmation',
        data: {
          orderNumber,
          customerName: payload.firstName || 'Valued Customer',
          total: payload.total,
          trackingUrl,
          items: payload.items || [],
        },
      },
      `notif_order_confirm_${event.id}`
    );
  });

  // 2. Order Shipped Notification
  registerDomainEventHandler('order.shipped', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || event.aggregateId;
    const email = payload.email as string;

    if (!email) return;

    const accessToken = generateOrderAccessToken(orderNumber, email);
    const trackingUrl = `${appUrl}/order/${orderNumber}?token=${accessToken}`;

    await dispatchTransactionalEmail(
      {
        to: email,
        subject: `Your Order #${orderNumber} Has Shipped! 🚚 — Unwind and Doodle`,
        template: 'order_shipped',
        data: {
          orderNumber,
          trackingUrl,
          deliveryAddress: payload.deliveryAddress,
        },
      },
      `notif_order_shipped_${event.id}`
    );
  });

  // 3. Stock Replenishment Notification
  registerDomainEventHandler('stock_notification.eligible', async (event) => {
    const payload = event.payload as {
      productId: string;
      recipients: {
        notificationId: string;
        email?: string;
        phone?: string;
        channel: string;
      }[];
    };

    if (!payload?.recipients) return;

    for (const recipient of payload.recipients) {
      if (recipient.channel === 'email' && recipient.email) {
        await dispatchTransactionalEmail(
          {
            to: recipient.email,
            subject: `Back in Stock: An item you were watching is available! 🎨 — Unwind and Doodle`,
            template: 'stock_alert',
            data: {
              productId: payload.productId,
              productUrl: `${appUrl}/products`,
            },
          },
          `notif_stock_${recipient.notificationId}`
        );
      }
    }
  });
}

// Auto-register handlers when loaded
initializeNotificationEventHandlers();
