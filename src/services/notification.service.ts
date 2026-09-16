import nodemailer, { Transporter } from 'nodemailer';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { registerDomainEventHandler } from './events.service';
import { generateOrderAccessToken } from '../lib/order-token';
import { getConfig } from '../lib/config';
import { createInAppNotification } from './in-app-notification.service';
import { getServiceSupabaseClient } from '../lib/supabase/client';
import { formatPrice } from '../lib/format-utils';
import { EmailNotificationTemplate } from '../types/notification';

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  template: EmailNotificationTemplate;
  data: Record<string, unknown>;
  html?: string;
  text?: string;
}

// In-memory audit/sent register for idempotency in runtime session
const sentNotifications = new Set<string>();

import { getTransporter, setTransporter } from '../lib/email-transporter';
export { getTransporter, setTransporter };

/**
 * Clears the in-memory idempotency cache (mainly for test suites).
 */
export function clearNotificationCache(): void {
  sentNotifications.clear();
}

/**
 * Resolves recipient email addresses for admin notifications.
 * Priority order:
 * 1. AppConfig adminEmails (from ADMIN_NOTIFICATION_EMAILS / ADMIN_EMAILS)
 * 2. Organization members with 'owner' or 'admin' role in Supabase
 * 3. Fallback to SMTP from or default admin email
 */
export async function getAdminNotificationRecipients(
  supabase?: SupabaseClient<Database>,
  organizationId?: string,
  options?: { ignoreConfig?: boolean }
): Promise<string[]> {
  const { adminEmails, smtp } = getConfig();

  if (!options?.ignoreConfig && adminEmails && adminEmails.length > 0) {
    return adminEmails;
  }

  if (supabase && organizationId) {
    try {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', organizationId)
        .in('role', ['owner', 'admin']);

      if (members && members.length > 0) {
        const userIds = members.map((m) => m.user_id);
        const { data: customers } = await supabase
          .from('customers')
          .select('email')
          .in('user_id', userIds);

        const memberEmails = (customers || [])
          .map((c) => c.email?.trim().toLowerCase())
          .filter(Boolean);

        if (memberEmails.length > 0) {
          return Array.from(new Set(memberEmails));
        }
      }
    } catch (err) {
      console.warn('[notification.admin_recipients_lookup_failed]', err);
    }
  }

  // Fallback to smtp.from address or default admin email
  const fallbackEmail = smtp?.from ? smtp.from.replace(/.*<([^>]+)>.*/, '$1').trim() : '';
  return fallbackEmail ? [fallbackEmail] : ['admin@unwindanddoodle.com'];
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
      const total = data.total ? formatPrice(Number(data.total)) : '';
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
                  <td style="text-align: right;">${item.unit_price || item.price ? formatPrice(item.unit_price || item.price) : '—'}</td>
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

    case 'admin_new_order': {
      const orderNumber = String(data.orderNumber || '');
      const customerName = String(data.customerName || 'Customer');
      const customerEmail = String(data.customerEmail || 'N/A');
      const total = data.total ? formatPrice(Number(data.total)) : 'N/A';
      const orderSource = String(data.orderSource || 'online');
      const adminUrl = String(data.adminUrl || '#');
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
                  <td style="text-align: right;">${item.unit_price || item.price ? formatPrice(item.unit_price || item.price) : '—'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `
        : '';

      const body = `
        <h2>New Order Received! 🛒</h2>
        <p>A new <strong>${orderSource}</strong> order <strong>#${orderNumber}</strong> has been placed.</p>
        <div class="highlight-box">
          <p style="margin: 0;"><strong>Customer:</strong> ${customerName} (${customerEmail})</p>
          <p style="margin: 4px 0 0;"><strong>Total Value:</strong> ${total}</p>
        </div>
        ${itemsHtml}
        <div style="text-align: center;">
          <a href="${adminUrl}" class="btn">View in Admin Console</a>
        </div>
      `;

      const text = `
New Order Received: #${orderNumber}
Customer: ${customerName} (${customerEmail})
Order Source: ${orderSource}
Total: ${total}

View in Admin Orders:
${adminUrl}

— Unwind and Doodle Admin
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'admin_order_cancelled': {
      const orderNumber = String(data.orderNumber || '');
      const note = data.note ? String(data.note) : 'No reason specified';
      const previousStatus = String(data.previousStatus || 'N/A');
      const adminUrl = String(data.adminUrl || '#');

      const body = `
        <h2>Order Cancelled ⚠️</h2>
        <p>Order <strong>#${orderNumber}</strong> has been cancelled.</p>
        <div class="highlight-box" style="background: #fef2f2; border-color: #fecaca; color: #991b1b;">
          <p style="margin: 0;"><strong>Previous Status:</strong> ${previousStatus}</p>
          <p style="margin: 4px 0 0;"><strong>Reason / Note:</strong> ${note}</p>
        </div>
        <div style="text-align: center;">
          <a href="${adminUrl}" class="btn" style="background-color: #dc2626;">Review in Admin Orders</a>
        </div>
      `;

      const text = `
Order Cancelled: #${orderNumber}
Previous Status: ${previousStatus}
Reason / Note: ${note}

Review in Admin Orders:
${adminUrl}

— Unwind and Doodle Admin
      `.trim();

      return { html: baseHtmlWrapper(subject, body), text };
    }

    case 'admin_low_stock': {
      const productName = String(data.productName || 'Product');
      const sku = data.sku ? `(SKU: ${data.sku})` : '';
      const warehouseName = String(data.warehouseName || 'Main Warehouse');
      const availableQuantity = Number(data.availableQuantity ?? 0);
      const threshold = Number(data.threshold ?? 5);
      const isOutOfStock = Boolean(data.isOutOfStock || availableQuantity <= 0);
      const adminUrl = String(data.adminUrl || '#');

      const body = `
        <h2>${isOutOfStock ? 'Product Out of Stock! 🚨' : 'Low Stock Warning ⚠️'}</h2>
        <p>
          Inventory level for <strong>${productName}</strong> ${sku} has fallen to
          <strong style="color: ${isOutOfStock ? '#dc2626' : '#d97706'}; font-size: 16px;">${availableQuantity} unit(s)</strong>
          in <strong>${warehouseName}</strong>.
        </p>
        <div class="highlight-box" style="background: ${isOutOfStock ? '#fef2f2' : '#fffbeb'}; border-color: ${isOutOfStock ? '#fecaca' : '#fde68a'}; color: ${isOutOfStock ? '#991b1b' : '#92400e'};">
          <p style="margin: 0;"><strong>Safety Threshold:</strong> ${threshold} units</p>
          <p style="margin: 4px 0 0;"><strong>Status:</strong> ${isOutOfStock ? 'OUT OF STOCK' : 'LOW STOCK'}</p>
        </div>
        <div style="text-align: center;">
          <a href="${adminUrl}" class="btn" style="background-color: ${isOutOfStock ? '#dc2626' : '#d97706'};">Restock / Manage Inventory</a>
        </div>
      `;

      const text = `
${isOutOfStock ? 'OUT OF STOCK ALERT' : 'LOW STOCK WARNING'}: ${productName} ${sku}
Remaining Units: ${availableQuantity}
Warehouse: ${warehouseName}
Safety Threshold: ${threshold}

Manage Inventory:
${adminUrl}

— Unwind and Doodle Admin
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

    if (email) {
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
    }

    // Create in-app notifications for customer & admin
    try {
      const supabase = getServiceSupabaseClient();
      const customerId = (payload.customerId as string) || (payload.customer_id as string) || null;

      if (customerId) {
        await createInAppNotification(supabase, {
          recipientType: 'customer',
          recipientId: customerId,
          title: `Order #${orderNumber} Confirmed! 🎉`,
          message: 'Thank you for your order! We are preparing your doodle kit with care.',
          type: 'success',
          category: 'order',
          link: `/order/${orderNumber}`,
          metadata: { orderNumber, total: payload.total },
        });
      }

      await createInAppNotification(supabase, {
        recipientType: 'admin',
        title: `New Order #${orderNumber}`,
        message: payload.total ? `New order received totaling ${formatPrice(payload.total as number)}` : `New order #${orderNumber} placed`,
        type: 'info',
        category: 'order',
        link: '/admin/orders',
        metadata: { orderNumber, total: payload.total },
      });

      // Dispatch admin new order alert email
      const orgId = (payload.organizationId as string) || (payload.organization_id as string);
      const adminRecipients = await getAdminNotificationRecipients(supabase, orgId);
      for (const adminEmail of adminRecipients) {
        await dispatchTransactionalEmail(
          {
            to: adminEmail,
            subject: `🛒 New Order #${orderNumber} (${payload.total ? formatPrice(payload.total as number) : 'Pending'}) — Unwind and Doodle Admin`,
            template: 'admin_new_order',
            data: {
              orderNumber,
              customerName: payload.firstName || payload.customerName || 'Customer',
              customerEmail: email || 'N/A',
              total: payload.total,
              items: payload.items || [],
              orderSource: payload.orderSource || payload.order_source || 'online',
              adminUrl: `${appUrl}/admin/orders`,
            },
          },
          `notif_admin_order_${orderNumber}_${adminEmail}_${event.id}`
        );
      }
    } catch (inAppErr) {
      console.warn('[notification.in_app_skipped]', inAppErr);
    }
  });

  // 2. Order Shipped Notification
  registerDomainEventHandler('order.shipped', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || event.aggregateId;
    const email = payload.email as string;

    if (email) {
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
    }

    // Create in-app notification for customer
    try {
      const supabase = getServiceSupabaseClient();
      const customerId = (payload.customerId as string) || (payload.customer_id as string) || null;

      if (customerId) {
        await createInAppNotification(supabase, {
          recipientType: 'customer',
          recipientId: customerId,
          title: `Order #${orderNumber} Shipped! 🚚`,
          message: 'Your doodle kit is on its way. Track your package anytime.',
          type: 'info',
          category: 'order',
          link: `/order/${orderNumber}`,
          metadata: { orderNumber },
        });
      }
    } catch (inAppErr) {
      console.warn('[notification.in_app_shipped_skipped]', inAppErr);
    }
  });

  // 3. Order Cancelled Notification (Admin in-app & Email)
  registerDomainEventHandler('order.cancelled', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || event.aggregateId;
    const note = (payload.note as string) || null;
    const previousStatus = (payload.previousStatus as string) || 'unknown';

    try {
      const supabase = getServiceSupabaseClient();
      const orgId = (payload.organizationId as string) || (payload.organization_id as string);

      await createInAppNotification(supabase, {
        recipientType: 'admin',
        title: `Order #${orderNumber} Cancelled ⚠️`,
        message: note ? `Order #${orderNumber} was cancelled: ${note}` : `Order #${orderNumber} has been cancelled.`,
        type: 'warning',
        category: 'order',
        link: '/admin/orders',
        metadata: { orderNumber, note, previousStatus },
      });

      const adminRecipients = await getAdminNotificationRecipients(supabase, orgId);
      for (const adminEmail of adminRecipients) {
        await dispatchTransactionalEmail(
          {
            to: adminEmail,
            subject: `⚠️ Order #${orderNumber} Cancelled — Unwind and Doodle Admin`,
            template: 'admin_order_cancelled',
            data: {
              orderNumber,
              note,
              previousStatus,
              adminUrl: `${appUrl}/admin/orders`,
            },
          },
          `notif_admin_cancel_${orderNumber}_${adminEmail}_${event.id}`
        );
      }
    } catch (err) {
      console.warn('[notification.order_cancelled_skipped]', err);
    }
  });

  // 4. Order Refunded Notification (Admin in-app)
  registerDomainEventHandler('order.refunded', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || event.aggregateId;

    try {
      const supabase = getServiceSupabaseClient();
      await createInAppNotification(supabase, {
        recipientType: 'admin',
        title: `Order #${orderNumber} Refunded 💸`,
        message: `Order #${orderNumber} has been marked as refunded.`,
        type: 'info',
        category: 'order',
        link: '/admin/orders',
        metadata: { orderNumber, previousStatus: payload.previousStatus },
      });
    } catch (err) {
      console.warn('[notification.order_refunded_skipped]', err);
    }
  });

  // 5. Manual Order Created Notification (Admin in-app)
  registerDomainEventHandler('order.created', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    if (payload.orderSource === 'manual') {
      try {
        const supabase = getServiceSupabaseClient();
        const orderNumber = payload.orderNumber as string;
        await createInAppNotification(supabase, {
          recipientType: 'admin',
          title: `Manual Order Created: #${orderNumber} ✍️`,
          message: payload.totalAmount
            ? `Manual order #${orderNumber} created totaling ${formatPrice(payload.totalAmount as number)}`
            : `Manual order #${orderNumber} created`,
          type: 'info',
          category: 'order',
          link: '/admin/orders',
          metadata: { orderNumber, total: payload.totalAmount, orderSource: 'manual' },
        });
      } catch (err) {
        console.warn('[notification.manual_order_created_in_app_skipped]', err);
      }
    }
  });

  // 6. Low / Out of Stock Inventory Alert (Admin in-app & Email)
  registerDomainEventHandler('inventory.low_stock', async (event) => {
    const payload = event.payload as {
      productId: string;
      productName?: string;
      sku?: string | null;
      warehouseId: string;
      warehouseName?: string;
      availableQuantity: number;
      threshold: number;
      isOutOfStock?: boolean;
      organizationId?: string;
    };

    if (!payload) return;

    const isOutOfStock = Boolean(payload.isOutOfStock || payload.availableQuantity <= 0);
    const productName = payload.productName || 'Product';
    const warehouseName = payload.warehouseName || 'Warehouse';
    const availableQuantity = payload.availableQuantity ?? 0;
    const threshold = payload.threshold ?? 5;

    try {
      const supabase = getServiceSupabaseClient();

      await createInAppNotification(supabase, {
        recipientType: 'admin',
        title: isOutOfStock
          ? `Out of Stock: ${productName} 🚨`
          : `Low Stock Alert: ${productName} ⚠️`,
        message: isOutOfStock
          ? `${productName} is now completely out of stock in ${warehouseName}.`
          : `Only ${availableQuantity} unit(s) remaining in ${warehouseName} (safety threshold: ${threshold}).`,
        type: isOutOfStock ? 'error' : 'warning',
        category: 'inventory',
        link: payload.productId ? `/admin/inventory/${payload.productId}` : '/admin/inventory',
        metadata: {
          productId: payload.productId,
          warehouseId: payload.warehouseId,
          availableQuantity,
          threshold,
          isOutOfStock,
        },
      });

      const adminRecipients = await getAdminNotificationRecipients(supabase, payload.organizationId);
      for (const adminEmail of adminRecipients) {
        await dispatchTransactionalEmail(
          {
            to: adminEmail,
            subject: `${isOutOfStock ? '🚨 Out of Stock' : '⚠️ Low Stock Alert'}: ${productName} — Unwind and Doodle`,
            template: 'admin_low_stock',
            data: {
              productId: payload.productId,
              productName,
              sku: payload.sku,
              warehouseName,
              availableQuantity,
              threshold,
              isOutOfStock,
              adminUrl: `${appUrl}/admin/inventory/${payload.productId || ''}`,
            },
          },
          `notif_admin_stock_${payload.productId}_${payload.warehouseId}_${isOutOfStock ? 'out' : 'low'}_${adminEmail}_${event.id}`
        );
      }
    } catch (err) {
      console.warn('[notification.inventory_low_stock_skipped]', err);
    }
  });

  // 7. Stock Replenishment Notification
  registerDomainEventHandler('stock_notification.eligible', async (event) => {
    const payload = event.payload as {
      productId: string;
      recipients: {
        notificationId: string;
        customerId?: string;
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

      // Create in-app notification if customerId is present
      if (recipient.customerId) {
        try {
          const supabase = getServiceSupabaseClient();
          await createInAppNotification(supabase, {
            recipientType: 'customer',
            recipientId: recipient.customerId,
            title: 'Back in Stock! 🎨',
            message: 'An item from your wishlist is now back in stock and ready to order.',
            type: 'success',
            category: 'stock',
            link: '/products',
            metadata: { productId: payload.productId },
          });
        } catch (inAppErr) {
          console.warn('[notification.in_app_stock_skipped]', inAppErr);
        }
      }
    }
  });
}

// Auto-register handlers when loaded
initializeNotificationEventHandlers();
