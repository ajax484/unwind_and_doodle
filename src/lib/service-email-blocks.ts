import { V1CampaignBlock, V1TextBlock, V1ButtonBlock, V1CalloutBlock, V1DividerBlock } from '@/types/marketing-builder';
import { EmailNotificationTemplate } from '@/types/notification';
import { compileCampaignBlocksToHtml } from '@/services/marketing-renderer.service';

function generateBlockId(prefix: string): string {
  return `blk_${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Canonical visual blocks for each of the 8 transactional service email templates.
 */
export const SERVICE_EMAIL_DEFAULT_BLOCKS: Record<EmailNotificationTemplate, V1CampaignBlock[]> = {
  order_confirmation: [
    {
      id: 'blk_ord_h1',
      type: 'text',
      data: {
        content: 'Order Confirmed! 🎉',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_ord_body1',
      type: 'text',
      data: {
        content: 'Hello {{customerName}},\n\nThank you for your order! We\'ve received your order #{{orderNumber}} and are preparing it with care.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_ord_summary',
      type: 'callout',
      data: {
        title: 'Order Summary',
        message: 'Total Amount: {{total}}',
        variant: 'rose',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_ord_items',
      type: 'text',
      data: {
        content: '{{itemsTable}}',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_ord_btn',
      type: 'button',
      data: {
        text: 'View Order & Track Status',
        url: '{{trackingUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
    {
      id: 'blk_ord_footer',
      type: 'text',
      data: {
        content: 'You can access your order status anytime using the link above.',
        style: 'small',
        align: 'center',
      },
    } as V1TextBlock,
  ],

  order_shipped: [
    {
      id: 'blk_ship_h1',
      type: 'text',
      data: {
        content: 'Your Order is on its Way! 🚚',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_ship_body',
      type: 'text',
      data: {
        content: 'Great news! Your order #{{orderNumber}} has been shipped and is heading to your destination.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_ship_dest',
      type: 'callout',
      data: {
        title: 'Delivery Destination',
        message: '{{deliveryAddress}}',
        variant: 'blue',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_ship_btn',
      type: 'button',
      data: {
        text: 'Track Shipment',
        url: '{{trackingUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
  ],

  order_cancelled: [
    {
      id: 'blk_cncl_h1',
      type: 'text',
      data: {
        content: 'Order Cancelled',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_cncl_body',
      type: 'text',
      data: {
        content: "Hello {{customerName}},\n\nWe're writing to let you know that your order #{{orderNumber}} has been cancelled.",
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_cncl_reason',
      type: 'callout',
      data: {
        title: 'Cancellation Details',
        message: 'Reason: {{note}}',
        variant: 'rose',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_cncl_refund',
      type: 'text',
      data: {
        content: 'If you have already made payment for this order, your refund is being processed to your original payment method. Please allow 3–5 business days for it to reflect in your account.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_cncl_btn',
      type: 'button',
      data: {
        text: 'Return to Store',
        url: '{{storeUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
  ],

  review_request: [
    {
      id: 'blk_rev_h1',
      type: 'text',
      data: {
        content: 'How are you loving your new pieces? ✍️',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_rev_body',
      type: 'text',
      data: {
        content: 'Hi {{customerName}},\n\nThank you for shopping with Unwind & Doodle! We hope your items brought a little spark of joy to your day. We\'d love to hear your thoughts on your recent order (#{{orderNumber}}).',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_rev_btn',
      type: 'button',
      data: {
        text: 'Leave a Review',
        url: '{{reviewUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
    {
      id: 'blk_rev_footer',
      type: 'text',
      data: {
        content: 'Your feedback helps us create better art supplies for our creative community.',
        style: 'small',
        align: 'center',
      },
    } as V1TextBlock,
  ],

  stock_alert: [
    {
      id: 'blk_stock_h1',
      type: 'text',
      data: {
        content: 'Back in Stock! 🎨',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_stock_body',
      type: 'text',
      data: {
        content: 'Good news! An item on your wishlist ({{productName}}) is now back in stock and ready to order.\n\nStock is limited, so grab yours before it runs out again!',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_stock_btn',
      type: 'button',
      data: {
        text: 'View Product',
        url: '{{productUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
  ],

  team_invitation: [
    {
      id: 'blk_team_h1',
      type: 'text',
      data: {
        content: "You're Invited! 🤝",
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_team_body',
      type: 'text',
      data: {
        content: 'Hello,\n\n{{invitedBy}} has invited you to join the team at {{organizationName}} as a {{role}} member.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_team_btn',
      type: 'button',
      data: {
        text: 'Accept Invitation & Join Team',
        url: '{{inviteUrl}}',
        align: 'center',
        style: 'rose',
      },
    } as V1ButtonBlock,
    {
      id: 'blk_team_footer',
      type: 'text',
      data: {
        content: 'This invitation link will expire on {{expiresAt}}.',
        style: 'small',
        align: 'center',
      },
    } as V1TextBlock,
  ],

  admin_new_order: [
    {
      id: 'blk_adnord_h1',
      type: 'text',
      data: {
        content: 'New Order Received! 🛒',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adnord_body',
      type: 'text',
      data: {
        content: 'A new {{orderSource}} order #{{orderNumber}} has been placed.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adnord_callout',
      type: 'callout',
      data: {
        title: 'Customer Details',
        message: 'Customer: {{customerName}} ({{customerEmail}})\nTotal Value: {{total}}',
        variant: 'cream',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_adnord_items',
      type: 'text',
      data: {
        content: '{{itemsTable}}',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adnord_btn',
      type: 'button',
      data: {
        text: 'View in Admin Console',
        url: '{{adminUrl}}',
        align: 'center',
        style: 'primary',
      },
    } as V1ButtonBlock,
  ],

  admin_order_cancelled: [
    {
      id: 'blk_adncanc_h1',
      type: 'text',
      data: {
        content: 'Order Cancelled ⚠️',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adncanc_body',
      type: 'text',
      data: {
        content: 'Order #{{orderNumber}} has been cancelled.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adncanc_callout',
      type: 'callout',
      data: {
        title: 'Cancellation Details',
        message: 'Previous Status: {{previousStatus}}\nReason / Note: {{note}}',
        variant: 'rose',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_adncanc_btn',
      type: 'button',
      data: {
        text: 'Review in Admin Orders',
        url: '{{adminUrl}}',
        align: 'center',
        style: 'secondary',
      },
    } as V1ButtonBlock,
  ],

  admin_low_stock: [
    {
      id: 'blk_adnstock_h1',
      type: 'text',
      data: {
        content: 'Low Stock & Inventory Alert ⚠️',
        style: 'heading',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adnstock_body',
      type: 'text',
      data: {
        content: 'Inventory level for {{productName}} {{sku}} has fallen to {{availableQuantity}} unit(s) in {{warehouseName}}.',
        style: 'body',
        align: 'left',
      },
    } as V1TextBlock,
    {
      id: 'blk_adnstock_callout',
      type: 'callout',
      data: {
        title: 'Safety Threshold',
        message: 'Safety Threshold: {{threshold}} units\nStatus: Low stock trigger',
        variant: 'rose',
      },
    } as V1CalloutBlock,
    {
      id: 'blk_adnstock_btn',
      type: 'button',
      data: {
        text: 'Restock / Manage Inventory',
        url: '{{adminUrl}}',
        align: 'center',
        style: 'primary',
      },
    } as V1ButtonBlock,
  ],
};

/**
 * Returns a cloned array of default blocks for a given template key.
 */
export function getDefaultBlocksForTemplate(templateKey: EmailNotificationTemplate): V1CampaignBlock[] {
  const defaults = SERVICE_EMAIL_DEFAULT_BLOCKS[templateKey];
  if (!defaults) {
    return [
      {
        id: generateBlockId('text'),
        type: 'text',
        data: {
          content: 'Notification message...',
          style: 'body',
          align: 'left',
        },
      } as V1TextBlock,
    ];
  }
  return JSON.parse(JSON.stringify(defaults));
}

/**
 * Parses bodyHtml to blocks if stored as JSON, or falls back to template default blocks.
 */
export function templateContentToBlocks(
  bodyHtml: string | undefined | null,
  templateKey: EmailNotificationTemplate
): V1CampaignBlock[] {
  if (!bodyHtml || !bodyHtml.trim()) {
    return getDefaultBlocksForTemplate(templateKey);
  }

  const trimmed = bodyHtml.trim();
  if (trimmed.startsWith('{') && trimmed.includes('"blocks"')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
        return parsed.blocks;
      }
    } catch {
      // Fall through to default blocks
    }
  }

  return getDefaultBlocksForTemplate(templateKey);
}

/**
 * Compiles an array of campaign blocks into email HTML.
 */
export function compileServiceEmailBlocks(blocks: V1CampaignBlock[]): string {
  return compileCampaignBlocksToHtml(blocks);
}

/**
 * Encodes blocks and compiled HTML into a payload stored in the database.
 */
export function serializeServiceEmailBody(blocks: V1CampaignBlock[]): string {
  const html = compileServiceEmailBlocks(blocks);
  return JSON.stringify({
    version: 1,
    blocks,
    html,
  });
}
