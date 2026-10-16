import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../lib/supabase/types';
import { EmailNotificationTemplate } from '../types/notification';
import {
  ServiceEmailCategory,
  ServiceEmailTemplateDefinition,
  ServiceEmailTemplateDetail,
  ServiceEmailTemplateOverride,
  ServiceEmailTemplateSummary,
  UpdateServiceEmailTemplateInput,
} from '../types/service-email';
import { sanitizeHtml } from '../lib/sanitize-html';
import { formatPrice } from '../lib/format-utils';
import { compileCampaignBlocksToHtml } from './marketing-renderer.service';
import { getDefaultBlocksForTemplate, templateContentToBlocks } from '../lib/service-email-blocks';

/**
 * Escapes HTML characters in user-provided strings to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates and sanitizes a URL for safe usage in href attributes.
 */
export function sanitizeUrl(url: unknown): string {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:')
  ) {
    return '#';
  }
  return trimmed;
}

/**
 * Formats a brand container wrapper around email body content.
 */
export function baseHtmlWrapper(title: string, bodyContent: string): string {
  const brandName = 'Unwind and Doodle';
  const brandColor = '#4F46E5';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
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
}

/**
 * Renders an HTML table of line items for order emails.
 */
export function renderItemsHtmlTable(
  items: Array<{ name?: string; product_name?: string; quantity?: number; unit_price?: number; price?: number }>
): string {
  if (!items || items.length === 0) return '';
  return `
    <table class="item-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th style="text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${items
          .map((item) => {
            const name = escapeHtml(item.product_name || item.name || 'Item');
            const qty = item.quantity ?? 1;
            const price = item.unit_price ?? item.price;
            const formattedPrice = price != null ? formatPrice(price) : '—';
            return `
              <tr>
                <td>${name}</td>
                <td>${qty}</td>
                <td style="text-align: right;">${formattedPrice}</td>
              </tr>
            `;
          })
          .join('')}
      </tbody>
    </table>
  `.trim();
}

/**
 * Canonical registry of all supported transactional / service email templates.
 */
export const SERVICE_EMAIL_REGISTRY: Record<EmailNotificationTemplate, ServiceEmailTemplateDefinition> = {
  order_confirmation: {
    key: 'order_confirmation',
    name: 'Order Confirmation',
    description: 'Sent to customers immediately after an order is placed or payment is confirmed.',
    category: 'order',
    defaultSubject: 'Order Confirmed: #{{orderNumber}} — Unwind and Doodle',
    defaultBodyHtml: `
<h2>Order Confirmed! 🎉</h2>
<p>Hello <strong>{{customerName}}</strong>,</p>
<p>Thank you for your order! We've received your order <strong>#{{orderNumber}}</strong> and are preparing it with care.</p>
{{#if total}}
<p><strong>Total Amount:</strong> {{total}}</p>
{{/if}}
{{itemsTable}}
<div style="text-align: center;">
  <a href="{{trackingUrl}}" class="btn">View Order & Track Status</a>
</div>
<p style="font-size: 13px; color: #6b7280;">You can access your order status anytime using the link above.</p>
    `.trim(),
    defaultBodyText: `
Order Confirmed: #{{orderNumber}}
Hello {{customerName}},

Thank you for your order! We have received order #{{orderNumber}} and are preparing it.
{{#if total}}Total: {{total}}
{{/if}}
Track your order status here:
{{trackingUrl}}

— Unwind and Doodle
    `.trim(),
    variables: [
      { key: 'orderNumber', label: 'Order Number', description: 'Unique order identifier', example: 'ORD-98210', type: 'string' },
      { key: 'customerName', label: 'Customer Name', description: 'Customer full or first name', example: 'Amina Bello', type: 'string' },
      { key: 'total', label: 'Total Amount', description: 'Formatted currency total', example: '₦45,000', type: 'string' },
      { key: 'trackingUrl', label: 'Tracking URL', description: 'Direct link to track the order status', example: 'https://unwindanddoodle.com/order/ORD-98210?token=abc', type: 'string' },
      { key: 'itemsTable', label: 'Items Table', description: 'Pre-formatted table of purchased items', example: '[Table of items]', type: 'string' },
    ],
    sampleData: {
      orderNumber: 'ORD-98210',
      customerName: 'Amina Bello',
      total: '₦45,000',
      trackingUrl: 'https://unwindanddoodle.com/order/ORD-98210?token=sample_token',
      items: [
        { name: 'Doodle Sketchbook Pro', quantity: 2, unit_price: 15000 },
        { name: 'Metallic Ink Pens (Set of 12)', quantity: 1, unit_price: 15000 },
      ],
    },
  },

  order_shipped: {
    key: 'order_shipped',
    name: 'Order Shipped',
    description: 'Sent to customers when their order has been dispatched with delivery details.',
    category: 'order',
    defaultSubject: 'Your Order #{{orderNumber}} Has Shipped! 🚚 — Unwind and Doodle',
    defaultBodyHtml: `
<h2>Your Order is on its Way! 🚚</h2>
<p>Great news! Your order <strong>#{{orderNumber}}</strong> has been shipped and is heading to your destination.</p>
{{#if deliveryAddress}}
<div class="highlight-box">
  <strong>Delivery Destination:</strong><br>
  <pre style="margin: 4px 0; font-family: inherit;">{{deliveryAddress}}</pre>
</div>
{{/if}}
<div style="text-align: center;">
  <a href="{{trackingUrl}}" class="btn">Track Shipment</a>
</div>
    `.trim(),
    defaultBodyText: `
Your Order #{{orderNumber}} Has Shipped!
Your package is on its way.

Track your shipment:
{{trackingUrl}}

— Unwind and Doodle
    `.trim(),
    variables: [
      { key: 'orderNumber', label: 'Order Number', description: 'Unique order identifier', example: 'ORD-77123', type: 'string' },
      { key: 'trackingUrl', label: 'Tracking URL', description: 'Shipment tracking link', example: 'https://unwindanddoodle.com/order/ORD-77123?token=xyz', type: 'string' },
      { key: 'deliveryAddress', label: 'Delivery Address', description: 'Customer shipping destination', example: '15 Victoria Island Blvd, Lagos', type: 'string' },
    ],
    sampleData: {
      orderNumber: 'ORD-77123',
      trackingUrl: 'https://unwindanddoodle.com/order/ORD-77123?token=sample_xyz',
      deliveryAddress: '15 Victoria Island Blvd, Lagos',
    },
  },

  review_request: {
    key: 'review_request',
    name: 'Review Request',
    description: 'Sent to customers following successful order delivery to request a product review.',
    category: 'customer',
    defaultSubject: 'How was your experience with Order #{{orderNumber}}? ⭐ — Unwind and Doodle',
    defaultBodyHtml: `
<h2>How was your experience? ⭐</h2>
<p>We hope you are loving your items from order <strong>#{{orderNumber}}</strong>!</p>
<p>Your feedback helps us create better doodle kits and crafting experiences for everyone.</p>
<div style="text-align: center;">
  <a href="{{reviewUrl}}" class="btn">Leave a Review</a>
</div>
    `.trim(),
    defaultBodyText: `
How was your experience with Order #{{orderNumber}}?
We'd love to hear your feedback!

Leave a review:
{{reviewUrl}}

— Unwind and Doodle
    `.trim(),
    variables: [
      { key: 'orderNumber', label: 'Order Number', description: 'Order identifier', example: 'ORD-55421', type: 'string' },
      { key: 'reviewUrl', label: 'Review URL', description: 'Direct link to submit a review', example: 'https://unwindanddoodle.com/account/orders/ORD-55421', type: 'string' },
    ],
    sampleData: {
      orderNumber: 'ORD-55421',
      reviewUrl: 'https://unwindanddoodle.com/account/orders/ORD-55421',
    },
  },

  stock_alert: {
    key: 'stock_alert',
    name: 'Back in Stock Alert',
    description: 'Sent to subscribed customers when an out-of-stock product is replenished.',
    category: 'customer',
    defaultSubject: 'Back in Stock: An item you were watching is available! 🎨 — Unwind and Doodle',
    defaultBodyHtml: `
<h2>Back in Stock! 🎨</h2>
<p>Good news! An item on your wishlist is now back in stock and ready to order.</p>
<p>Stock is limited, so grab yours before it runs out again!</p>
<div style="text-align: center;">
  <a href="{{productUrl}}" class="btn">View Product</a>
</div>
    `.trim(),
    defaultBodyText: `
Back in Stock!
An item you were watching is back in stock.

Order now:
{{productUrl}}

— Unwind and Doodle
    `.trim(),
    variables: [
      { key: 'productUrl', label: 'Product URL', description: 'Link to view the replenished item', example: 'https://unwindanddoodle.com/products/safari-coloring-book', type: 'string' },
      { key: 'productName', label: 'Product Name', description: 'Optional name of the replenished product', example: 'Safari Coloring Book', type: 'string' },
    ],
    sampleData: {
      productUrl: 'https://unwindanddoodle.com/products/safari-coloring-book',
      productName: 'Safari Coloring Book',
    },
  },

  team_invitation: {
    key: 'team_invitation',
    name: 'Team Invitation',
    description: 'Sent when an administrator invites a staff member to join the workspace.',
    category: 'team',
    defaultSubject: "You've been invited to join {{organizationName}}! 🤝",
    defaultBodyHtml: `
<h2>You're Invited! 🤝</h2>
<p>Hello,</p>
<p><strong>{{invitedBy}}</strong> has invited you to join the team at <strong>{{organizationName}}</strong> as a <strong>{{role}}</strong> member.</p>
<div style="text-align: center;">
  <a href="{{inviteUrl}}" class="btn">Accept Invitation & Join Team</a>
</div>
<p style="font-size: 13px; color: #6b7280;">This invitation link will expire on <strong>{{expiresAt}}</strong>.</p>
    `.trim(),
    defaultBodyText: `
You've been invited to join {{organizationName}}!
{{invitedBy}} has invited you to join the team as a {{role}}.

Accept your invitation here:
{{inviteUrl}}

This link expires on {{expiresAt}}.

— Unwind and Doodle
    `.trim(),
    variables: [
      { key: 'organizationName', label: 'Organization Name', description: 'Name of the workspace/store', example: 'Unwind & Doodle Studio', type: 'string' },
      { key: 'invitedBy', label: 'Invited By', description: 'Name or email of the inviting admin', example: 'Tunde Adeleke', type: 'string' },
      { key: 'role', label: 'Role', description: 'Assigned role (e.g. admin, manager, staff)', example: 'admin', type: 'string' },
      { key: 'inviteUrl', label: 'Invitation URL', description: 'Acceptance link with verification token', example: 'https://unwindanddoodle.com/invite/tok_abc123', type: 'string' },
      { key: 'expiresAt', label: 'Expires At', description: 'Expiration date or duration description', example: '2026-10-23', type: 'string' },
    ],
    sampleData: {
      organizationName: 'Unwind & Doodle Studio',
      invitedBy: 'Tunde Adeleke',
      role: 'admin',
      inviteUrl: 'https://unwindanddoodle.com/invite/tok_abc123',
      expiresAt: '2026-10-23',
    },
  },

  admin_new_order: {
    key: 'admin_new_order',
    name: 'Admin: New Order Received',
    description: 'Internal operational notification dispatched to administrators upon every new sale.',
    category: 'admin',
    defaultSubject: '🛒 New Order #{{orderNumber}} ({{total}}) — Unwind and Doodle Admin',
    defaultBodyHtml: `
<h2>New Order Received! 🛒</h2>
<p>A new <strong>{{orderSource}}</strong> order <strong>#{{orderNumber}}</strong> has been placed.</p>
<div class="highlight-box">
  <p style="margin: 0;"><strong>Customer:</strong> {{customerName}} ({{customerEmail}})</p>
  <p style="margin: 4px 0 0;"><strong>Total Value:</strong> {{total}}</p>
</div>
{{itemsTable}}
<div style="text-align: center;">
  <a href="{{adminUrl}}" class="btn">View in Admin Console</a>
</div>
    `.trim(),
    defaultBodyText: `
New Order Received: #{{orderNumber}}
Customer: {{customerName}} ({{customerEmail}})
Order Source: {{orderSource}}
Total: {{total}}

View in Admin Orders:
{{adminUrl}}

— Unwind and Doodle Admin
    `.trim(),
    variables: [
      { key: 'orderNumber', label: 'Order Number', description: 'Unique order identifier', example: 'ORD-30041', type: 'string' },
      { key: 'customerName', label: 'Customer Name', description: 'Name of the buyer', example: 'Chidi Okonkwo', type: 'string' },
      { key: 'customerEmail', label: 'Customer Email', description: 'Email address of the buyer', example: 'chidi@example.com', type: 'string' },
      { key: 'total', label: 'Total Value', description: 'Formatted monetary total', example: '₦32,500', type: 'string' },
      { key: 'orderSource', label: 'Order Source', description: 'Channel (online, manual, in-person)', example: 'online', type: 'string' },
      { key: 'adminUrl', label: 'Admin Order URL', description: 'Direct link to the order in Admin Console', example: 'https://unwindanddoodle.com/admin/orders', type: 'string' },
      { key: 'itemsTable', label: 'Items Table', description: 'Table listing purchased items and quantities', example: '[Table of items]', type: 'string' },
    ],
    sampleData: {
      orderNumber: 'ORD-30041',
      customerName: 'Chidi Okonkwo',
      customerEmail: 'chidi@example.com',
      total: '₦32,500',
      orderSource: 'online',
      adminUrl: 'https://unwindanddoodle.com/admin/orders',
      items: [
        { name: 'Custom Family Portrait Coloring Book', quantity: 1, unit_price: 32500 },
      ],
    },
  },

  admin_order_cancelled: {
    key: 'admin_order_cancelled',
    name: 'Admin: Order Cancelled',
    description: 'Internal alert dispatched to store administrators whenever an order is cancelled.',
    category: 'admin',
    defaultSubject: '⚠️ Order #{{orderNumber}} Cancelled — Unwind and Doodle Admin',
    defaultBodyHtml: `
<h2>Order Cancelled ⚠️</h2>
<p>Order <strong>#{{orderNumber}}</strong> has been cancelled.</p>
<div class="highlight-box" style="background: #fef2f2; border-color: #fecaca; color: #991b1b;">
  <p style="margin: 0;"><strong>Previous Status:</strong> {{previousStatus}}</p>
  <p style="margin: 4px 0 0;"><strong>Reason / Note:</strong> {{note}}</p>
</div>
<div style="text-align: center;">
  <a href="{{adminUrl}}" class="btn" style="background-color: #dc2626;">Review in Admin Orders</a>
</div>
    `.trim(),
    defaultBodyText: `
Order Cancelled: #{{orderNumber}}
Previous Status: {{previousStatus}}
Reason / Note: {{note}}

Review in Admin Orders:
{{adminUrl}}

— Unwind and Doodle Admin
    `.trim(),
    variables: [
      { key: 'orderNumber', label: 'Order Number', description: 'Cancelled order identifier', example: 'ORD-10928', type: 'string' },
      { key: 'previousStatus', label: 'Previous Status', description: 'Status before cancellation', example: 'confirmed', type: 'string' },
      { key: 'note', label: 'Cancellation Note / Reason', description: 'Reason provided for cancellation', example: 'Customer requested change of address', type: 'string' },
      { key: 'adminUrl', label: 'Admin URL', description: 'Link to admin order management', example: 'https://unwindanddoodle.com/admin/orders', type: 'string' },
    ],
    sampleData: {
      orderNumber: 'ORD-10928',
      previousStatus: 'confirmed',
      note: 'Customer requested change of address',
      adminUrl: 'https://unwindanddoodle.com/admin/orders',
    },
  },

  admin_low_stock: {
    key: 'admin_low_stock',
    name: 'Admin: Low & Out of Stock Alert',
    description: 'Urgent operational notification when inventory falls below defined safety threshold.',
    category: 'admin',
    defaultSubject: '{{#if isOutOfStock}}🚨 Out of Stock{{else}}⚠️ Low Stock Alert{{/if}}: {{productName}} — Unwind and Doodle',
    defaultBodyHtml: `
<h2>{{#if isOutOfStock}}Product Out of Stock! 🚨{{else}}Low Stock Warning ⚠️{{/if}}</h2>
<p>
  Inventory level for <strong>{{productName}}</strong> {{sku}} has fallen to
  <strong style="color: {{#if isOutOfStock}}#dc2626{{else}}#d97706{{/if}}; font-size: 16px;">{{availableQuantity}} unit(s)</strong>
  in <strong>{{warehouseName}}</strong>.
</p>
<div class="highlight-box" style="background: {{#if isOutOfStock}}#fef2f2{{else}}#fffbeb{{/if}}; border-color: {{#if isOutOfStock}}#fecaca{{else}}#fde68a{{/if}}; color: {{#if isOutOfStock}}#991b1b{{else}}#92400e{{/if}};">
  <p style="margin: 0;"><strong>Safety Threshold:</strong> {{threshold}} units</p>
  <p style="margin: 4px 0 0;"><strong>Status:</strong> {{#if isOutOfStock}}OUT OF STOCK{{else}}LOW STOCK{{/if}}</p>
</div>
<div style="text-align: center;">
  <a href="{{adminUrl}}" class="btn" style="background-color: {{#if isOutOfStock}}#dc2626{{else}}#d97706{{/if}};">Restock / Manage Inventory</a>
</div>
    `.trim(),
    defaultBodyText: `
{{#if isOutOfStock}}OUT OF STOCK ALERT{{else}}LOW STOCK WARNING{{/if}}: {{productName}} {{sku}}
Remaining Units: {{availableQuantity}}
Warehouse: {{warehouseName}}
Safety Threshold: {{threshold}}

Manage Inventory:
{{adminUrl}}

— Unwind and Doodle Admin
    `.trim(),
    variables: [
      { key: 'productName', label: 'Product Name', description: 'Name of the low stock item', example: 'Bleed-resistant Sketchbook A4', type: 'string' },
      { key: 'sku', label: 'SKU', description: 'Product SKU code', example: 'BK-SKETCH-01', type: 'string' },
      { key: 'warehouseName', label: 'Warehouse Name', description: 'Location where stock is low', example: 'Abuja Central Warehouse', type: 'string' },
      { key: 'availableQuantity', label: 'Available Quantity', description: 'Current available unit count', example: '2', type: 'number' },
      { key: 'threshold', label: 'Safety Threshold', description: 'Minimum trigger threshold', example: '5', type: 'number' },
      { key: 'isOutOfStock', label: 'Is Out of Stock', description: 'Boolean flag true when quantity is 0 or less', example: 'false', type: 'boolean' },
      { key: 'adminUrl', label: 'Admin Inventory URL', description: 'Link to restock item in Admin Console', example: 'https://unwindanddoodle.com/admin/inventory', type: 'string' },
    ],
    sampleData: {
      productName: 'Bleed-resistant Sketchbook A4',
      sku: '(SKU: BK-SKETCH-01)',
      warehouseName: 'Abuja Central Warehouse',
      availableQuantity: 2,
      threshold: 5,
      isOutOfStock: false,
      adminUrl: 'https://unwindanddoodle.com/admin/inventory',
    },
  },
};

/**
 * In-memory cache for organization template overrides to optimize performance.
 * Keyed by: `${organizationId}:${templateKey}`
 */
interface CacheEntry {
  override: ServiceEmailTemplateOverride | null;
  cachedAt: number;
}
const templateCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes

export function invalidateTemplateCache(organizationId: string, templateKey?: EmailNotificationTemplate): void {
  if (templateKey) {
    templateCache.delete(`${organizationId}:${templateKey}`);
  } else {
    for (const key of templateCache.keys()) {
      if (key.startsWith(`${organizationId}:`)) {
        templateCache.delete(key);
      }
    }
  }
}

export function clearAllTemplateCache(): void {
  templateCache.clear();
}

export function getCachedOverride(
  organizationId: string,
  templateKey: EmailNotificationTemplate
): ServiceEmailTemplateOverride | null {
  const cacheKey = `${organizationId}:${templateKey}`;
  const now = Date.now();
  const cached = templateCache.get(cacheKey);
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.override;
  }
  return null;
}

/**
 * Safely evaluates simple {{#if key}}...{{else}}...{{/if}} and {{#if key}}...{{/if}} conditionals.
 */
function evaluateConditionals(template: string, data: Record<string, unknown>): string {
  let res = template;
  let prev = '';
  let count = 0;
  while (res !== prev && count < 10) {
    prev = res;
    count++;
    res = res.replace(
      /\{\{#if\s+([a-zA-Z0-9_]+)\}\}((?:(?!\{\{#if|\{\{\/if)[\s\S])*?)(?:\{\{else\}\}((?:(?!\{\{#if|\{\{\/if)[\s\S])*?))?\{\{\/if\}\}/,
      (_, key, trueBlock, falseBlock = '') => {
        const val = data[key];
        const isTruthy = Boolean(val) && val !== '0' && val !== 0 && val !== 'false';
        return isTruthy ? trueBlock : falseBlock;
      }
    );
  }
  return res;
}

/**
 * Safely interpolates variables into a template string without arbitrary code execution.
 * HTML context escapes string values; plain-text context does not escape.
 */
export function interpolateTemplate(
  template: string,
  data: Record<string, unknown>,
  options: { isHtml: boolean }
): string {
  if (!template || typeof template !== 'string') return '';

  // 1. Pre-process itemsTable token if items array is provided
  let processed = template;
  if (options.isHtml && processed.includes('{{itemsTable}}')) {
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const tableHtml = renderItemsHtmlTable(rawItems as any);
    processed = processed.replace(/\{\{\s*itemsTable\s*\}\}/g, tableHtml);
  } else if (!options.isHtml && processed.includes('{{itemsTable}}')) {
    // For plain text, format a simple text list
    const rawItems = Array.isArray(data.items) ? data.items : [];
    const textList = rawItems
      .map((it: any) => `- ${it.product_name || it.name || 'Item'} x${it.quantity ?? 1}`)
      .join('\n');
    processed = processed.replace(/\{\{\s*itemsTable\s*\}\}/g, textList);
  }

  // 2. Evaluate conditionals {{#if key}}...{{/if}}
  processed = evaluateConditionals(processed, data);

  // 3. Support collection loop {{#each items}}...{{/each}}
  processed = processed.replace(
    /\{\{#each\s+items\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, itemBlock) => {
      const rawItems = Array.isArray(data.items) ? data.items : [];
      return rawItems
        .map((item: any) => {
          let itemRow = itemBlock;
          itemRow = itemRow.replace(/\{\{\s*(?:name|product_name)\s*\}\}/g, options.isHtml ? escapeHtml(item.product_name || item.name || '') : (item.product_name || item.name || ''));
          itemRow = itemRow.replace(/\{\{\s*quantity\s*\}\}/g, String(item.quantity ?? 1));
          const price = item.unit_price ?? item.price;
          const formattedPrice = price != null ? formatPrice(price) : '—';
          itemRow = itemRow.replace(/\{\{\s*(?:price|unit_price)\s*\}\}/g, formattedPrice);
          return itemRow;
        })
        .join('');
    }
  );

  // 4. Interpolate standard variables {{key}}
  processed = processed.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
    const rawValue = data[key];

    if (rawValue === undefined || rawValue === null) {
      return '';
    }

    if (typeof rawValue === 'object') {
      // If object passed to scalar token, format as JSON string
      const str = JSON.stringify(rawValue, null, 2);
      return options.isHtml ? escapeHtml(str) : str;
    }

    // URL special handling
    if (key.toLowerCase().endsWith('url')) {
      const safe = sanitizeUrl(rawValue);
      return options.isHtml ? escapeHtml(safe) : safe;
    }

    // Price special handling if number
    if (key === 'total' && typeof rawValue === 'number') {
      return formatPrice(rawValue);
    }

    const str = String(rawValue);
    return options.isHtml ? escapeHtml(str) : str;
  });

  return processed;
}

/**
 * Loads an organization-specific template override from the database or cache.
 * Catches errors safely and falls back to null rather than failing email delivery.
 */
export async function getServiceEmailOverride(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  templateKey: EmailNotificationTemplate
): Promise<ServiceEmailTemplateOverride | null> {
  const cacheKey = `${organizationId}:${templateKey}`;
  const now = Date.now();
  const cached = templateCache.get(cacheKey);

  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return cached.override;
  }

  try {
    const { data, error } = await supabase
      .from('service_email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('template_key', templateKey)
      .maybeSingle();

    if (error || !data) {
      templateCache.set(cacheKey, { override: null, cachedAt: now });
      return null;
    }

    const override: ServiceEmailTemplateOverride = {
      id: data.id,
      organizationId: data.organization_id,
      templateKey: data.template_key as EmailNotificationTemplate,
      subject: data.subject,
      bodyHtml: data.body_html,
      bodyText: data.body_text,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      updatedBy: data.updated_by,
    };

    templateCache.set(cacheKey, { override, cachedAt: now });
    return override;
  } catch (err) {
    // Non-blocking log to ensure transactional email delivery never fails due to DB outage
    console.warn('[service_email.override_lookup_failed]', {
      organizationId,
      templateKey,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Lists all available transactional email templates with their customization status.
 */
export async function listServiceEmailTemplates(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<ServiceEmailTemplateSummary[]> {
  const { data: overrides, error } = await supabase
    .from('service_email_templates')
    .select('template_key, is_active, updated_at')
    .eq('organization_id', organizationId);

  if (error) {
    console.warn('[service_email.list_failed]', error.message);
  }

  const overrideMap = new Map((overrides || []).map((o) => [o.template_key, o]));

  return Object.values(SERVICE_EMAIL_REGISTRY).map((def) => {
    const override = overrideMap.get(def.key);
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      category: def.category,
      isCustomized: Boolean(override),
      isActive: override ? override.is_active : true,
      updatedAt: override?.updated_at,
    };
  });
}

/**
 * Extracts plain email HTML from body content, parsing JSON blocks when present.
 */
export function extractHtmlFromBody(bodyHtml: string | undefined | null): string {
  if (!bodyHtml || typeof bodyHtml !== 'string') return '';
  const trimmed = bodyHtml.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"blocks"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.html && typeof parsed.html === 'string') return parsed.html;
      if (Array.isArray(parsed.blocks)) return compileCampaignBlocksToHtml(parsed.blocks);
    } catch {
      return bodyHtml;
    }
  }
  return bodyHtml;
}

/**
 * Retrieves full details for a template, including its default and effective contents.
 */
export async function getServiceEmailTemplateDetail(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  templateKey: EmailNotificationTemplate
): Promise<ServiceEmailTemplateDetail> {
  const definition = SERVICE_EMAIL_REGISTRY[templateKey];
  if (!definition) {
    throw new Error(`Unknown service email template: ${templateKey}`);
  }

  const override = await getServiceEmailOverride(supabase, organizationId, templateKey);

  const isCustomized = Boolean(override);
  const isActive = override ? override.isActive : true;

  const rawEffectiveHtml = override && override.isActive ? override.bodyHtml : definition.defaultBodyHtml;
  const effectiveBodyHtml = extractHtmlFromBody(rawEffectiveHtml);
  const blocks = override && override.isActive
    ? templateContentToBlocks(override.bodyHtml, definition.key)
    : getDefaultBlocksForTemplate(definition.key);

  return {
    key: definition.key,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    defaultSubject: definition.defaultSubject,
    defaultBodyHtml: definition.defaultBodyHtml,
    defaultBodyText: definition.defaultBodyText,
    variables: definition.variables,
    sampleData: definition.sampleData,
    effectiveSubject: override && override.isActive ? override.subject : definition.defaultSubject,
    effectiveBodyHtml,
    effectiveBodyText: override && override.isActive ? (override.bodyText || definition.defaultBodyText) : definition.defaultBodyText,
    isCustomized,
    isActive,
    updatedAt: override?.updatedAt,
    updatedBy: override?.updatedBy,
    blocks,
  };
}

/**
 * Saves a customized override for an organization's service email template.
 * Sanitizes HTML to eliminate scripts, malicious attributes, and tracking exploits.
 */
export async function upsertServiceEmailOverride(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  templateKey: EmailNotificationTemplate,
  input: UpdateServiceEmailTemplateInput,
  userId?: string | null
): Promise<ServiceEmailTemplateDetail> {
  const definition = SERVICE_EMAIL_REGISTRY[templateKey];
  if (!definition) {
    throw new Error(`Invalid template key: ${templateKey}`);
  }

  if (!input.subject || !input.subject.trim()) {
    throw new Error('Email subject is required');
  }

  if (!input.bodyHtml || !input.bodyHtml.trim()) {
    throw new Error('Email HTML body is required');
  }

  let finalBodyHtml: string;

  if (input.blocks && Array.isArray(input.blocks) && input.blocks.length > 0) {
    const compiled = compileCampaignBlocksToHtml(input.blocks);
    const sanitizedHtml = sanitizeHtml(compiled);
    finalBodyHtml = JSON.stringify({
      version: 1,
      blocks: input.blocks,
      html: sanitizedHtml,
    });
  } else if (input.bodyHtml.trim().startsWith('{') && input.bodyHtml.includes('"blocks"')) {
    try {
      const parsed = JSON.parse(input.bodyHtml);
      if (parsed.html) {
        parsed.html = sanitizeHtml(parsed.html);
      } else if (Array.isArray(parsed.blocks)) {
        parsed.html = sanitizeHtml(compileCampaignBlocksToHtml(parsed.blocks));
      }
      finalBodyHtml = JSON.stringify(parsed);
    } catch {
      finalBodyHtml = sanitizeHtml(input.bodyHtml);
    }
  } else {
    finalBodyHtml = sanitizeHtml(input.bodyHtml);
  }

  const payload = {
    organization_id: organizationId,
    template_key: templateKey,
    subject: input.subject.trim(),
    body_html: finalBodyHtml,
    body_text: input.bodyText ? input.bodyText.trim() : null,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
    updated_by: userId || null,
  };

  const { error } = await supabase
    .from('service_email_templates')
    .upsert(payload, { onConflict: 'organization_id,template_key' });

  if (error) {
    throw new Error(`Failed to save template override: ${error.message}`);
  }

  invalidateTemplateCache(organizationId, templateKey);

  return getServiceEmailTemplateDetail(supabase, organizationId, templateKey);
}

/**
 * Resets a service email template to its canonical system default by removing the DB override.
 */
export async function resetServiceEmailTemplate(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  templateKey: EmailNotificationTemplate
): Promise<ServiceEmailTemplateDetail> {
  const definition = SERVICE_EMAIL_REGISTRY[templateKey];
  if (!definition) {
    throw new Error(`Invalid template key: ${templateKey}`);
  }

  const { error } = await supabase
    .from('service_email_templates')
    .delete()
    .eq('organization_id', organizationId)
    .eq('template_key', templateKey);

  if (error) {
    throw new Error(`Failed to reset template to default: ${error.message}`);
  }

  invalidateTemplateCache(organizationId, templateKey);

  return getServiceEmailTemplateDetail(supabase, organizationId, templateKey);
}

/**
 * Canonical default email renderer for the 8 built-in transactional emails.
 * Preserves exact compatibility and formatting with existing notifications.
 */
export function renderDefaultEmail(
  template: EmailNotificationTemplate,
  data: Record<string, unknown>,
  customSubject?: string
): { html: string; text: string; subject: string } {
  switch (template) {
    case 'order_confirmation': {
      const orderNumber = String(data.orderNumber || '');
      const customerName = String(data.customerName || 'Valued Customer');
      const total = data.total ? (typeof data.total === 'number' ? formatPrice(data.total) : String(data.total)) : '';
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

      const subject = customSubject || `Order Confirmed: #${orderNumber} — Unwind and Doodle`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
    }

    case 'order_shipped': {
      const orderNumber = String(data.orderNumber || '');
      const trackingUrl = String(data.trackingUrl || '#');
      const deliveryAddress = data.deliveryAddress ? (typeof data.deliveryAddress === 'string' ? data.deliveryAddress : JSON.stringify(data.deliveryAddress, null, 2)) : '';

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

      const subject = customSubject || `Your Order #${orderNumber} Has Shipped! 🚚 — Unwind and Doodle`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
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

      const subject = customSubject || 'Back in Stock: An item you were watching is available! 🎨 — Unwind and Doodle';
      return { html: baseHtmlWrapper(subject, body), text, subject };
    }

    case 'team_invitation': {
      const inviteUrl = String(data.inviteUrl || '#');
      const orgName = String(data.organizationName || 'our store');
      const role = String(data.role || 'staff');
      const invitedBy = String(data.invitedBy || 'An administrator');
      const expiresAt = data.expiresAt ? (typeof data.expiresAt === 'string' && data.expiresAt.includes('T') ? new Date(String(data.expiresAt)).toLocaleDateString() : String(data.expiresAt)) : '7 days';

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

      const subject = customSubject || `You've been invited to join ${orgName}! 🤝`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
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

      const subject = customSubject || `How was your experience with Order #${orderNumber}? ⭐ — Unwind and Doodle`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
    }

    case 'admin_new_order': {
      const orderNumber = String(data.orderNumber || '');
      const customerName = String(data.customerName || 'Customer');
      const customerEmail = String(data.customerEmail || 'N/A');
      const total = data.total ? (typeof data.total === 'number' ? formatPrice(data.total) : String(data.total)) : 'N/A';
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

      const subject = customSubject || `🛒 New Order #${orderNumber} (${total}) — Unwind and Doodle Admin`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
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

      const subject = customSubject || `⚠️ Order #${orderNumber} Cancelled — Unwind and Doodle Admin`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
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

      const subject = customSubject || `${isOutOfStock ? '🚨 Out of Stock' : '⚠️ Low Stock Alert'}: ${productName} — Unwind and Doodle`;
      return { html: baseHtmlWrapper(subject, body), text, subject };
    }

    default: {
      const subject = customSubject || 'Notification';
      const body = `<p>${subject}</p>`;
      return { html: baseHtmlWrapper(subject, body), text: subject, subject };
    }
  }
}

/**
 * Authoritative rendering engine: combines default or override template with dynamic data.
 */
export function renderServiceEmail(
  templateKey: EmailNotificationTemplate,
  data: Record<string, unknown>,
  options: {
    override?: { subject?: string; bodyHtml?: string; bodyText?: string | null; isActive?: boolean } | null;
    customSubject?: string;
  } = {}
): { html: string; text: string; subject: string } {
  const activeOverride = options.override && options.override.isActive !== false ? options.override : null;

  // Fallback to canonical default if no active override
  if (!activeOverride) {
    return renderDefaultEmail(templateKey, data, options.customSubject);
  }

  const definition = SERVICE_EMAIL_REGISTRY[templateKey];
  const rawSubject = activeOverride.subject || options.customSubject || definition?.defaultSubject || '';
  const rawBodyHtml = extractHtmlFromBody(activeOverride.bodyHtml || definition?.defaultBodyHtml || '');
  const rawBodyText = activeOverride.bodyText || definition?.defaultBodyText || '';

  // Interpolate dynamic variables
  const subject = interpolateTemplate(rawSubject, data, { isHtml: false });
  const innerHtml = interpolateTemplate(rawBodyHtml, data, { isHtml: true });
  const text = interpolateTemplate(rawBodyText, data, { isHtml: false });

  // If the rendered HTML already includes a full <html> document, return as is; otherwise wrap in brand container
  const html = innerHtml.toLowerCase().includes('<html')
    ? innerHtml
    : baseHtmlWrapper(subject, innerHtml);

  return { html, text, subject };
}
