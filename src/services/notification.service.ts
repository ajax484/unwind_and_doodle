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
import {
  renderServiceEmail,
  getServiceEmailOverride,
  getCachedOverride,
  baseHtmlWrapper,
} from './service-email.service';
import { ServiceEmailTemplateOverride } from '../types/service-email';
export { baseHtmlWrapper };

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  template: EmailNotificationTemplate;
  data: Record<string, unknown>;
  html?: string;
  text?: string;
  organizationId?: string;
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
 * Supports organization-specific database overrides while preserving full backward compatibility.
 */
export function renderEmailTemplate(
  template: EmailNotificationPayload['template'],
  data: Record<string, unknown>,
  subject: string,
  override?: ServiceEmailTemplateOverride | null
): { html: string; text: string; subject: string } {
  let activeOverride = override;
  if (!activeOverride) {
    const orgId = (data?.organizationId as string) || (data?.organization_id as string);
    if (orgId) {
      const cached = getCachedOverride(orgId, template);
      if (cached && cached.isActive) {
        activeOverride = cached;
      }
    }
  }

  return renderServiceEmail(template, data, {
    override: activeOverride,
    customSubject: subject,
  });
}

/**
 * Dispatches an asynchronous transactional notification via Nodemailer.
 * Integrates with email infrastructure without coupling to the DB transaction.
 * Resolves active organization overrides when an organization context is provided.
 */
export async function dispatchTransactionalEmail(
  payload: EmailNotificationPayload,
  idempotencyKey?: string,
  customSupabase?: SupabaseClient<Database>
): Promise<{ success: boolean; messageId: string; error?: string }> {
  if (idempotencyKey && sentNotifications.has(idempotencyKey)) {
    console.info(`[notification.idempotent_skip] key=${idempotencyKey}`);
    return { success: true, messageId: `cached_${idempotencyKey}` };
  }

  const { smtp } = getConfig();
  const transporter = getTransporter();

  // 1. Resolve organization override if organizationId is present
  const orgId =
    payload.organizationId ||
    (payload.data?.organizationId as string) ||
    (payload.data?.organization_id as string);

  let override: ServiceEmailTemplateOverride | null = null;
  if (orgId) {
    try {
      const supabase = getServiceSupabaseClient(customSupabase);
      override = await getServiceEmailOverride(supabase, orgId, payload.template);
    } catch (err) {
      console.warn('[notification.override_lookup_failed]', err);
    }
  }

  // 2. Render template (with override fallback)
  const { html, text, subject: renderedSubject } = renderEmailTemplate(
    payload.template,
    payload.data,
    payload.subject,
    override
  );

  const finalSubject =
    override && override.isActive && override.subject
      ? renderedSubject
      : (payload.subject || renderedSubject);

  try {
    const info = await transporter.sendMail({
      from: smtp?.from || 'Unwind and Doodle <no-reply@unwindanddoodle.com>',
      to: payload.to,
      subject: finalSubject,
      text: payload.text || text,
      html: payload.html || html,
    });

    const messageId = info.messageId || `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    console.info(
      `[notification.email_dispatched] to=${payload.to} template=${payload.template} subject="${finalSubject}" messageId=${messageId}`
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

let handlersInitialized = false;

/**
 * Initializes and registers domain event handlers for post-purchase lifecycle notifications.
 */
export function initializeNotificationEventHandlers(): void {
  if (handlersInitialized) return;
  handlersInitialized = true;

  const { appUrl } = getConfig();

  // 1. Order Confirmation (on order.pending or payment.completed)
  const handleOrderConfirmation = async (event: {
    id: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: unknown;
    createdAt: string;
  }) => {
    const payload = (event.payload && typeof event.payload === 'object' ? event.payload : {}) as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || (payload.order_number as string) || (event.aggregateType === 'order' ? event.aggregateId : '');

    let email = (payload.email as string) || (payload.customerEmail as string) || '';
    let items = (payload.items as Array<{ name?: string; product_name?: string; quantity: number; unit_price?: number; price?: number }>) || [];
    let total = typeof payload.total === 'number'
      ? payload.total
      : typeof payload.totalAmount === 'number'
        ? payload.totalAmount
        : typeof payload.amount === 'number'
          ? payload.amount
          : undefined;
    let customerName = (payload.customerName as string) || (payload.firstName as string) || '';
    let customerId = (payload.customerId as string) || (payload.customer_id as string) || null;
    let orgId = (payload.organizationId as string) || (payload.organization_id as string);
    const orderSource = (payload.orderSource as string) || (payload.order_source as string) || 'online';

    // Enrich missing fields from Supabase if needed
    if (!email || items.length === 0 || !total) {
      try {
        const supabase = getServiceSupabaseClient();
        const orderIdToLookup = (payload.orderId as string) || (event.aggregateType === 'order' ? event.aggregateId : null);
        
        let orderRow: any = null;
        if (orderIdToLookup) {
          const { data } = await supabase.from('orders').select('*').eq('id', orderIdToLookup).maybeSingle();
          orderRow = data;
        } else if (orderNumber) {
          const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
          orderRow = data;
        }

        if (orderRow) {
          if (!total) total = orderRow.total;
          if (!customerId) customerId = orderRow.customer_id;
          if (!orgId) orgId = orderRow.organization_id;

          if (items.length === 0) {
            const { data: dbItems } = await supabase.from('order_items').select('*').eq('order_id', orderRow.id);
            if (dbItems && dbItems.length > 0) {
              items = dbItems.map((i: any) => ({
                product_name: i.product_name,
                name: i.product_name,
                quantity: i.quantity,
                unit_price: i.unit_price,
              }));
            }
          }

          if (!email && orderRow.customer_id) {
            const { data: dbCustomer } = await supabase.from('customers').select('*').eq('id', orderRow.customer_id).maybeSingle();
            if (dbCustomer) {
              email = dbCustomer.email || '';
              if (!customerName) {
                customerName = `${dbCustomer.first_name || ''} ${dbCustomer.last_name || ''}`.trim() || dbCustomer.first_name || 'Customer';
              }
            }
          }
        }
      } catch (enrichErr) {
        console.warn('[notification.order_enrich_failed]', enrichErr);
      }
    }

    const effectiveCustomerName = customerName || 'Valued Customer';
    const effectiveOrderNumber = orderNumber || event.aggregateId;

    // Send customer confirmation email
    if (email) {
      const accessToken = generateOrderAccessToken(effectiveOrderNumber, email);
      const trackingUrl = `${appUrl}/order/${effectiveOrderNumber}?token=${accessToken}`;

      await dispatchTransactionalEmail(
        {
          to: email,
          subject: `Order Confirmed: #${effectiveOrderNumber} — Unwind and Doodle`,
          template: 'order_confirmation',
          data: {
            orderNumber: effectiveOrderNumber,
            customerName: effectiveCustomerName,
            total,
            trackingUrl,
            items,
          },
        },
        `notif_order_confirm_${effectiveOrderNumber}_${email}`
      );
    }

    // Create in-app notifications & send admin email
    try {
      const supabase = getServiceSupabaseClient();

      if (customerId) {
        await createInAppNotification(supabase, {
          recipientType: 'customer',
          recipientId: customerId,
          title: `Order #${effectiveOrderNumber} Confirmed! 🎉`,
          message: 'Thank you for your order! We are preparing your doodle kit with care.',
          type: 'success',
          category: 'order',
          link: `/order/${effectiveOrderNumber}`,
          metadata: { orderNumber: effectiveOrderNumber, total },
        });
      }

      await createInAppNotification(supabase, {
        recipientType: 'admin',
        title: `New Order #${effectiveOrderNumber}`,
        message: total ? `New order received totaling ${formatPrice(total)}` : `New order #${effectiveOrderNumber} placed`,
        type: 'info',
        category: 'order',
        link: '/admin/orders',
        metadata: { orderNumber: effectiveOrderNumber, total },
      });

      // Dispatch admin new order alert email
      const adminRecipients = await getAdminNotificationRecipients(supabase, orgId);
      for (const adminEmail of adminRecipients) {
        await dispatchTransactionalEmail(
          {
            to: adminEmail,
            subject: `🛒 New Order #${effectiveOrderNumber} (${total ? formatPrice(total) : 'Pending'}) — Unwind and Doodle Admin`,
            template: 'admin_new_order',
            data: {
              orderNumber: effectiveOrderNumber,
              customerName: effectiveCustomerName,
              customerEmail: email || 'N/A',
              total,
              items,
              orderSource,
              adminUrl: `${appUrl}/admin/orders`,
            },
          },
          `notif_admin_order_${effectiveOrderNumber}_${adminEmail}`
        );
      }
    } catch (inAppErr) {
      console.warn('[notification.in_app_skipped]', inAppErr);
    }
  };

  registerDomainEventHandler('order.created', handleOrderConfirmation);
  registerDomainEventHandler('order.pending', handleOrderConfirmation);
  registerDomainEventHandler('payment.completed', handleOrderConfirmation);

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

  // 3. Order Cancelled Notification (Admin & Customer in-app & Email)
  registerDomainEventHandler('order.cancelled', async (event) => {
    const payload = event.payload as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || event.aggregateId;
    const note = (payload.note as string) || null;
    const previousStatus = (payload.previousStatus as string) || 'unknown';

    try {
      const supabase = getServiceSupabaseClient();
      const orgId = (payload.organizationId as string) || (payload.organization_id as string);

      // Admin in-app notification
      try {
        await createInAppNotification(supabase, {
          recipientType: 'admin',
          title: `Order #${orderNumber} Cancelled ⚠️`,
          message: note ? `Order #${orderNumber} was cancelled: ${note}` : `Order #${orderNumber} has been cancelled.`,
          type: 'warning',
          category: 'order',
          link: '/admin/orders',
          metadata: { orderNumber, note, previousStatus },
        });
      } catch (inAppErr) {
        console.warn('[notification.in_app_cancel_skipped]', inAppErr);
      }

      // Admin email alerts
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

      // Customer enrichment & cancellation notification
      let customerEmail = (payload.email as string) || (payload.customerEmail as string) || '';
      let customerName = (payload.customerName as string) || (payload.firstName as string) || '';
      let customerId = (payload.customerId as string) || (payload.customer_id as string) || null;

      if (!customerEmail || !customerName || !customerId) {
        try {
          const orderIdToLookup = (payload.orderId as string) || (event.aggregateType === 'order' ? event.aggregateId : null);
          let orderRow: any = null;
          if (orderIdToLookup) {
            const { data } = await supabase.from('orders').select('*').eq('id', orderIdToLookup).maybeSingle();
            orderRow = data;
          } else if (orderNumber) {
            const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
            orderRow = data;
          }

          if (orderRow) {
            if (!customerId) customerId = orderRow.customer_id;
          }

          if (customerId) {
            const { data: dbCustomer } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
            if (dbCustomer) {
              if (!customerEmail) customerEmail = dbCustomer.email || '';
              if (!customerName) {
                customerName = `${dbCustomer.first_name || ''} ${dbCustomer.last_name || ''}`.trim() || dbCustomer.first_name || 'Valued Customer';
              }
            }
          }
        } catch (enrichErr) {
          console.warn('[notification.order_cancel_enrich_failed]', enrichErr);
        }
      }

      const effectiveCustomerName = customerName || 'Valued Customer';

      // Customer in-app notification
      if (customerId) {
        try {
          await createInAppNotification(supabase, {
            recipientType: 'customer',
            recipientId: customerId,
            title: `Order #${orderNumber} Cancelled`,
            message: note ? `Your order was cancelled: ${note}` : `Your order #${orderNumber} has been cancelled.`,
            type: 'warning',
            category: 'order',
            link: `/order/${orderNumber}`,
            metadata: { orderNumber, note, previousStatus },
          });
        } catch (inAppErr) {
          console.warn('[notification.in_app_customer_cancel_skipped]', inAppErr);
        }
      }

      // Customer cancellation email
      if (customerEmail) {
        await dispatchTransactionalEmail(
          {
            to: customerEmail,
            subject: `Your Order #${orderNumber} Has Been Cancelled — Unwind and Doodle`,
            template: 'order_cancelled',
            data: {
              orderNumber,
              customerName: effectiveCustomerName,
              note,
              previousStatus,
              storeUrl: appUrl,
              supportUrl: `${appUrl}/contact`,
            },
          },
          `notif_customer_cancel_${orderNumber}_${customerEmail}_${event.id}`
        );
      }
    } catch (err) {
      console.warn('[notification.order_cancelled_skipped]', err);
    }
  });

  // 4. Order Received Notification (Customer Review Request & in-app)
  registerDomainEventHandler('order.received', async (event) => {
    const payload = (event.payload && typeof event.payload === 'object' ? event.payload : {}) as Record<string, unknown>;
    const orderNumber = (payload.orderNumber as string) || (payload.order_number as string) || (event.aggregateType === 'order' ? event.aggregateId : '');

    let customerEmail = (payload.email as string) || (payload.customerEmail as string) || '';
    let customerName = (payload.customerName as string) || (payload.firstName as string) || '';
    let customerId = (payload.customerId as string) || (payload.customer_id as string) || null;
    let orgId = (payload.organizationId as string) || (payload.organization_id as string);

    // Enrich missing fields from Supabase if needed
    if (!customerEmail || !customerName || !customerId || !orgId) {
      try {
        const supabase = getServiceSupabaseClient();
        const orderIdToLookup = (payload.orderId as string) || (event.aggregateType === 'order' ? event.aggregateId : null);

        let orderRow: any = null;
        if (orderIdToLookup) {
          const { data } = await supabase.from('orders').select('*').eq('id', orderIdToLookup).maybeSingle();
          orderRow = data;
        } else if (orderNumber) {
          const { data } = await supabase.from('orders').select('*').eq('order_number', orderNumber).maybeSingle();
          orderRow = data;
        }

        if (orderRow) {
          if (!customerId) customerId = orderRow.customer_id;
          if (!orgId) orgId = orderRow.organization_id;

          if (customerId) {
            const { data: dbCustomer } = await supabase.from('customers').select('*').eq('id', customerId).maybeSingle();
            if (dbCustomer) {
              if (!customerEmail) customerEmail = dbCustomer.email || '';
              if (!customerName) {
                customerName = `${dbCustomer.first_name || ''} ${dbCustomer.last_name || ''}`.trim() || dbCustomer.first_name || 'Valued Customer';
              }
            }
          }
        }
      } catch (enrichErr) {
        console.warn('[notification.order_received_enrich_failed]', enrichErr);
      }
    }

    const effectiveCustomerName = customerName || 'Valued Customer';
    const effectiveOrderNumber = orderNumber || event.aggregateId;
    const reviewUrl = `${appUrl}/account/orders/${effectiveOrderNumber}`;

    // Customer review request email
    if (customerEmail) {
      try {
        await dispatchTransactionalEmail(
          {
            to: customerEmail,
            subject: `How was your experience with Order #${effectiveOrderNumber}? ⭐ — Unwind and Doodle`,
            template: 'review_request',
            data: {
              orderNumber: effectiveOrderNumber,
              customerName: effectiveCustomerName,
              reviewUrl,
              organizationId: orgId,
            },
            organizationId: orgId,
          },
          `notif_review_request_${effectiveOrderNumber}_${customerEmail}_${event.id}`
        );

        // Update review_requested_at on order
        try {
          const supabase = getServiceSupabaseClient();
          await supabase
            .from('orders')
            .update({ review_requested_at: new Date().toISOString() } as any)
            .eq('id', event.aggregateId);
        } catch (dbErr) {
          console.warn('[notification.order_review_requested_at_update_failed]', dbErr);
        }
      } catch (emailErr) {
        console.error('[notification.order_received_email_failed]', emailErr);
      }
    }

    // Customer in-app notification
    if (customerId) {
      try {
        const supabase = getServiceSupabaseClient();
        await createInAppNotification(supabase, {
          recipientType: 'customer',
          recipientId: customerId,
          title: `How was your order #${effectiveOrderNumber}? ⭐`,
          message: 'Your order has arrived! Leave a product review and share your feedback.',
          type: 'info',
          category: 'review',
          link: `/account/orders/${effectiveOrderNumber}`,
          metadata: { orderNumber: effectiveOrderNumber, reviewUrl },
        });
      } catch (inAppErr) {
        console.warn('[notification.in_app_review_request_skipped]', inAppErr);
      }
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
