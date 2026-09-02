import nodemailer, { Transporter } from 'nodemailer';
import { registerDomainEventHandler } from './events.service';
import { generateOrderAccessToken } from '../lib/order-token';
import { getConfig } from '../lib/config';

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  template: 'order_confirmation' | 'order_shipped' | 'review_request' | 'stock_alert' | 'team_invitation';
  data: Record<string, unknown>;
  html?: string;
  text?: string;
}

// In-memory audit/sent register for idempotency in runtime session
const sentNotifications = new Set<string>();

let activeTransporter: Transporter | null = null;

/**
 * Returns the current nodemailer transporter, or initializes one from AppConfig.
 * In development/test environments without SMTP credentials, falls back to a jsonTransport.
 */
export function getTransporter(): Transporter {
  if (activeTransporter) {
    return activeTransporter;
  }

  const { smtp } = getConfig();

  if (smtp && (smtp.service || smtp.host)) {
    activeTransporter = nodemailer.createTransport({
      service: smtp.service,
      host: smtp.host || undefined,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user
        ? {
            user: smtp.user,
            pass: smtp.pass,
          }
        : undefined,
    });
  } else {
    // Graceful fallback for tests / local development without SMTP credentials
    activeTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return activeTransporter;
}

/**
 * Allows overriding the active transporter (e.g. for unit tests).
 */
export function setTransporter(transporter: Transporter | null): void {
  activeTransporter = transporter;
}

/**
 * Clears the in-memory idempotency cache (mainly for test suites).
 */
export function clearNotificationCache(): void {
  sentNotifications.clear();
}

/**
 * Renders HTML and plain-text body for a given notification template.
 */
export function renderEmailTemplate(
  template: EmailNotificationPayload['template'],
  data: Record<string, unknown>,
  subject: string
): { html: string; text: string } {
  const brandName = 'Unwind and Doodle';
  const brandColor = '#4F46E5';

  const baseHtmlWrapper = (title: string, bodyContent: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 24px; color: #1f2937; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
    .header { background: #111827; padding: 24px 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; }
    .btn { display: inline-block; background-color: ${brandColor}; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; margin: 20px 0; text-align: center; }
    .footer { padding: 20px 32px; background: #f3f4f6; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
    .item-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .item-table th { text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; font-size: 13px; color: #4b5563; }
    .item-table td { padding: 8px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .highlight-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; color: #166534; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${brandName}</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
      <p>If you have any questions, reply directly to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  switch (template) {
    case 'order_confirmation': {
      const orderNumber = String(data.orderNumber || '');
      const customerName = String(data.customerName || 'Valued Customer');
      const total = data.total ? `₦${Number(data.total).toLocaleString()}` : '';
      const trackingUrl = String(data.trackingUrl || '#');
      const items = (data.items as Array<{ name?: string; product_name?: string; quantity: number; unit_price?: number; price?: number }>) || [];

      const itemsHtml = items.length > 0
        ? `
          <table class="item-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td>${item.product_name || item.name || 'Item'}</td>
                  <td>${item.quantity}</td>
                  <td style="text-align: right;">${item.unit_price || item.price ? `₦${Number(item.unit_price || item.price).toLocaleString()}` : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `
        : '';

      const body = `
        <h2>Order Confirmed! 🎉</h2>
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Thank you for your order! We've received your order <strong>#${orderNumber}</strong> and are preparing it with care.</p>
        ${total ? `<p><strong>Total Amount:</strong> ${total}</p>` : ''}
        ${itemsHtml}
        <div style="text-align: center;">
          <a href="${trackingUrl}" class="btn">View Order & Track Status</a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">You can access your order status anytime using the link above.</p>
      `;

      const text = `
Order Confirmed: #${orderNumber}
Hello ${customerName},

Thank you for your order! We have received order #${orderNumber} and are preparing it.
${total ? `Total: ${total}\n` : ''}
Track your order status here:
${trackingUrl}

— Unwind and Doodle
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'order_shipped': {
      const orderNumber = String(data.orderNumber || '');
      const trackingUrl = String(data.trackingUrl || '#');
      const deliveryAddress = data.deliveryAddress ? JSON.stringify(data.deliveryAddress, null, 2) : '';

      const body = `
        <h2>Your Order is on its Way! 🚚</h2>
        <p>Great news! Your order <strong>#${orderNumber}</strong> has been shipped and is heading to your destination.</p>
        ${deliveryAddress ? `<div class="highlight-box"><strong>Delivery Destination:</strong><br><pre style="margin: 4px 0; font-family: inherit;">${deliveryAddress}</pre></div>` : ''}
        <div style="text-align: center;">
          <a href="${trackingUrl}" class="btn">Track Shipment</a>
        </div>
      `;

      const text = `
Your Order #${orderNumber} Has Shipped!
Your package is on its way.

Track your shipment:
${trackingUrl}

— Unwind and Doodle
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'stock_alert': {
      const productUrl = String(data.productUrl || '#');

      const body = `
        <h2>Back in Stock! 🎨</h2>
        <p>Good news! An item on your wishlist is now back in stock and ready to order.</p>
        <p>Stock is limited, so grab yours before it runs out again!</p>
        <div style="text-align: center;">
          <a href="${productUrl}" class="btn">View Product</a>
        </div>
      `;

      const text = `
Back in Stock!
An item you were watching is back in stock.

Order now:
${productUrl}

— Unwind and Doodle
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'team_invitation': {
      const inviteUrl = String(data.inviteUrl || '#');
      const orgName = String(data.organizationName || 'our store');
      const role = String(data.role || 'staff');
      const invitedBy = String(data.invitedBy || 'An administrator');
      const expiresAt = data.expiresAt ? new Date(String(data.expiresAt)).toLocaleDateString() : '7 days';

      const body = `
        <h2>You're Invited! 🤝</h2>
        <p>Hello,</p>
        <p><strong>${invitedBy}</strong> has invited you to join the team at <strong>${orgName}</strong> as a <strong>${role}</strong> member.</p>
        <div style="text-align: center;">
          <a href="${inviteUrl}" class="btn">Accept Invitation & Join Team</a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">This invitation link will expire on <strong>${expiresAt}</strong>.</p>
      `;

      const text = `
You've been invited to join ${orgName}!
${invitedBy} has invited you to join the team as a ${role}.

Accept your invitation here:
${inviteUrl}

This link expires on ${expiresAt}.

— Unwind and Doodle
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'review_request': {
      const orderNumber = String(data.orderNumber || '');
      const reviewUrl = String(data.reviewUrl || '#');

      const body = `
        <h2>How was your experience? ⭐</h2>
        <p>We hope you are loving your items from order <strong>#${orderNumber}</strong>!</p>
        <p>Your feedback helps us create better doodle kits and crafting experiences for everyone.</p>
        <div style="text-align: center;">
          <a href="${reviewUrl}" class="btn">Leave a Review</a>
        </div>
      `;

      const text = `
How was your experience with Order #${orderNumber}?
We'd love to hear your feedback!

Leave a review:
${reviewUrl}

— Unwind and Doodle
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    default: {
      const body = `<p>${subject}</p>`;
      return { html: baseHtmlWrapper(subject, body), text: subject };
    }
  }
}

/**
 * Dispatches an asynchronous transactional notification via Nodemailer.
 * Integrates with email infrastructure without coupling to the DB transaction.
 */
export async function dispatchTransactionalEmail(
  payload: EmailNotificationPayload,
  idempotencyKey?: string
): Promise<{ success: boolean; messageId: string; error?: string }> {
  if (idempotencyKey && sentNotifications.has(idempotencyKey)) {
    console.info(`[notification.idempotent_skip] key=${idempotencyKey}`);
    return { success: true, messageId: `cached_${idempotencyKey}` };
  }

  const { smtp } = getConfig();
  const transporter = getTransporter();

  const { html, text } = renderEmailTemplate(payload.template, payload.data, payload.subject);

  try {
    const info = await transporter.sendMail({
      from: smtp?.from || 'Unwind and Doodle <no-reply@unwindanddoodle.com>',
      to: payload.to,
      subject: payload.subject,
      text: payload.text || text,
      html: payload.html || html,
    });

    const messageId = info.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.info(
      `[notification.email_dispatched] to=${payload.to} template=${payload.template} subject="${payload.subject}" messageId=${messageId}`
    );

    if (idempotencyKey) {
      sentNotifications.add(idempotencyKey);
    }

    return { success: true, messageId };
  } catch (error: any) {
    console.error(`[notification.email_failed] to=${payload.to} template=${payload.template} error=${error?.message || error}`);
    return {
      success: false,
      messageId: '',
      error: error?.message || 'Failed to dispatch email',
    };
  }
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
