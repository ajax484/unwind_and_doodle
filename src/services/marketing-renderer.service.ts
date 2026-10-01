import { MarketingContext, MarketingRecommendation } from '@/types/marketing-context';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { CampaignBlock } from '@/types/marketing';
import { V1CampaignBlock } from '@/types/marketing-builder';
import { formatPrice } from '@/lib/format-utils';

/**
 * Escapes unsafe HTML characters in scalar string inputs to prevent XSS.
 */
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderTemplateOptions {
  isHtml?: boolean;
  fallback?: string;
}

/**
 * Formats a recommendation into an HTML or plaintext snippet.
 * Renders the narrative block per the Unwind & Doodle retention playbook.
 */
export function formatRecommendationBlock(
  rec?: MarketingRecommendation | null,
  isHtml: boolean = true
): string {
  if (!rec || !rec.recommendationText) {
    return '';
  }

  const text = rec.recommendationText.trim();
  if (!text) return '';

  if (isHtml) {
    return `<div style="background-color: #FBF0F2; border: 1px solid #D99BA3; border-radius: 12px; padding: 16px 20px; margin: 16px 0; color: #9E4D58; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</div>`;
  }

  return text;
}

/**
 * Compiles a structured array of CampaignBlocks into email-safe responsive HTML.
 * Supports both V1 discriminated data schemas and legacy block definitions.
 */
export function compileCampaignBlocksToHtml(
  blocks: (CampaignBlock | V1CampaignBlock | any)[],
  options?: { isPreview?: boolean }
): string {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return '<p style="color: #52657A; font-family: sans-serif; text-align: center; margin: 20px 0;">No content written yet.</p>';
  }

  const brandRose = '#D99BA3';
  const brandRoseDeep = '#9E4D58';
  const brandBlue = '#A7C2D4';
  const textCharcoal = '#243342';
  const textSlate = '#52657A';
  const borderSoft = '#EDF3F7';

  const renderedBlocks: string[] = [];

  // Top Centered Brand Logo
  renderedBlocks.push(`
    <div style="text-align: center; padding: 20px 0 14px 0;">
      <a href="https://unwindanddoodle.com" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
        <img src="/logo.svg" alt="Unwind &amp; Doodle" width="48" height="48" style="width: 48px; height: 48px; display: block; margin: 0 auto; border: 0;" />
      </a>
      <div style="display: inline-block; padding: 4px 12px; background-color: #FBF0F2; color: #9E4D58; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 6px;">Unwind &amp; Doodle</div>
    </div>
  `);

  for (const block of blocks) {
    if (!block || !block.type) continue;

    const data = block.data || block;

    switch (block.type) {
      // 1. Text Block
      case 'text': {
        const rawContent = data.content || data.html || '';
        const style = data.style || 'body';
        const align = data.align || 'left';

        if (rawContent) {
          let fontSize = '15px';
          let fontWeight = '400';
          let lineHeight = '1.6';
          let color = textCharcoal;

          if (style === 'heading') {
            fontSize = '22px';
            fontWeight = '700';
            lineHeight = '1.3';
          } else if (style === 'small') {
            fontSize = '13px';
            color = textSlate;
            lineHeight = '1.5';
          }

          // If content is already paragraph/HTML, wrap or inline
          const contentHtml = rawContent.startsWith('<')
            ? rawContent
            : `<p style="margin: 0;">${escapeHtml(rawContent)}</p>`;

          renderedBlocks.push(`
            <div style="font-size: ${fontSize}; font-weight: ${fontWeight}; line-height: ${lineHeight}; color: ${color}; text-align: ${align}; margin: 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              ${contentHtml}
            </div>
          `);
        }
        break;
      }

      // 2. Image Block
      case 'image': {
        const url = data.url;
        if (url) {
          const alt = escapeHtml(data.altText || data.alt || 'Campaign Image');
          const align = data.align || 'center';
          const maxWidth = data.width === 'constrained' ? '360px' : '560px';
          const imgTag = `<img src="${escapeHtml(url)}" alt="${alt}" style="width: 100%; max-width: ${maxWidth}; height: auto; display: block; border-radius: 12px; border: 1px solid ${borderSoft}; margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0 auto 0 0'};" />`;
          const captionTag = data.caption ? `<p style="font-size: 12px; color: ${textSlate}; text-align: ${align}; margin-top: 6px; margin-bottom: 0;">${escapeHtml(data.caption)}</p>` : '';

          if (data.linkUrl) {
            renderedBlocks.push(`
              <div style="margin: 20px 0; text-align: ${align};">
                <a href="${escapeHtml(data.linkUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; width: 100%;">
                  ${imgTag}
                </a>
                ${captionTag}
              </div>
            `);
          } else {
            renderedBlocks.push(`
              <div style="margin: 20px 0; text-align: ${align};">
                ${imgTag}
                ${captionTag}
              </div>
            `);
          }
        }
        break;
      }

      // 3. Product Block (or legacy product_card)
      case 'product':
      case 'product_card': {
        const title = escapeHtml(data.title || 'Featured Product');
        const price = data.price;
        const priceStr = price !== undefined && price !== null
          ? (typeof price === 'number' ? formatPrice(price) : escapeHtml(String(price)))
          : '';
        const badge = data.badge
          ? `<span style="display: inline-block; padding: 3px 8px; background-color: #FBF0F2; color: #9E4D58; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(data.badge)}</span>`
          : '';
        const showDesc = data.showDescription !== false;
        const showPrice = data.showPrice !== false;
        const showCta = data.showCta !== false;
        const ctaText = escapeHtml(data.ctaText || 'Preorder Now');
        const ctaUrl = escapeHtml(data.ctaUrl || (data.slug ? `/products/${data.slug}` : '#'));
        const imageUrl = data.imageUrl;

        renderedBlocks.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderSoft}; border-radius: 14px; overflow: hidden; background-color: #FFFDF7; margin: 20px 0;">
            <tr>
              ${imageUrl ? `
                <td width="140" valign="middle" style="padding: 16px; width: 140px; text-align: center;">
                  <img src="${escapeHtml(imageUrl)}" alt="${title}" width="120" style="width: 120px; height: auto; max-height: 120px; border-radius: 10px; display: block; object-fit: cover; border: 1px solid ${borderSoft}; margin: 0 auto;" />
                </td>
              ` : ''}
              <td valign="middle" style="padding: 16px 20px;">
                ${badge}
                <div style="font-size: 16px; font-weight: 700; color: ${textCharcoal}; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</div>
                ${showDesc && data.description ? `<p style="font-size: 13px; color: ${textSlate}; margin: 0 0 8px 0; line-height: 1.5;">${escapeHtml(data.description)}</p>` : ''}
                ${showPrice && priceStr ? `<div style="font-size: 15px; font-weight: 800; color: ${brandRose}; margin-bottom: 12px;">${priceStr}</div>` : ''}
                ${showCta ? `
                  <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${brandRose}; color: #ffffff !important; text-decoration: none; padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    ${ctaText}
                  </a>
                ` : ''}
              </td>
            </tr>
          </table>
        `);
        break;
      }

      // 4. Product Grid Block
      case 'product_grid': {
        const heading = data.heading
          ? `<h3 style="font-size: 16px; font-weight: 700; color: ${textCharcoal}; margin: 0 0 12px 0; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${escapeHtml(data.heading)}</h3>`
          : '';
        const items = data.products || [];

        if (items.length > 0) {
          const rows: string[] = [];
          for (let i = 0; i < items.length; i += 2) {
            const pair = items.slice(i, i + 2);
            const cells = pair.map((item: any) => {
              const itemTitle = escapeHtml(item.title || 'Product');
              const itemPrice = item.price !== undefined && item.price !== null
                ? (typeof item.price === 'number' ? formatPrice(item.price) : escapeHtml(String(item.price)))
                : '';
              const itemUrl = escapeHtml(item.url || (item.slug ? `/products/${item.slug}` : '#'));

              return `
                <td width="50%" valign="top" style="padding: 8px; width: 50%;">
                  <div style="border: 1px solid ${borderSoft}; border-radius: 12px; padding: 12px; background-color: #ffffff; text-align: center; height: 100%;">
                    ${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="${itemTitle}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block;" />` : ''}
                    <div style="font-size: 13px; font-weight: 700; color: ${textCharcoal}; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemTitle}</div>
                    ${itemPrice ? `<div style="font-size: 13px; font-weight: 800; color: ${brandRose}; margin-bottom: 8px;">${itemPrice}</div>` : ''}
                    <a href="${itemUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #FBF0F2; color: #9E4D58 !important; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                      View Item
                    </a>
                  </div>
                </td>
              `;
            });

            if (cells.length === 1) {
              cells.push('<td width="50%" style="padding: 8px; width: 50%;"></td>');
            }

            rows.push(`<tr>${cells.join('')}</tr>`);
          }

          renderedBlocks.push(`
            <div style="margin: 20px 0;">
              ${heading}
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${rows.join('')}
              </table>
            </div>
          `);
        }
        break;
      }

      // 5. Button Block
      case 'button': {
        const text = escapeHtml(data.text || 'Shop Now');
        const url = escapeHtml(data.url || '#');
        const align = data.align || 'center';
        const isBlue = data.style === 'blue' || data.style === 'secondary';
        const btnBg = isBlue ? brandBlue : brandRose;
        const btnTextColor = isBlue ? '#243342' : '#FFFFFF';

        renderedBlocks.push(`
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
            <tr>
              <td align="${align}">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="display: inline-table; margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0 auto 0 0'};">
                  <tr>
                    <td align="center" style="background-color: ${btnBg}; border-radius: 9999px; padding: 14px 34px;">
                      <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${btnTextColor} !important; text-decoration: none; font-weight: 700; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: inline-block; line-height: 1;">
                        ${text}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `);
        break;
      }

      // 6. Callout Block (or legacy highlight_box)
      case 'callout':
      case 'highlight_box': {
        const title = data.title ? `<div style="font-weight: 700; font-size: 14px; margin-bottom: 4px;">${escapeHtml(data.title)}</div>` : '';
        const message = data.message || data.text || '';
        const variant = data.variant || 'rose';
        let bg = '#FBF0F2';
        let border = '#D99BA3';
        let color = brandRoseDeep;

        if (variant === 'blue') {
          bg = '#EBF3F8';
          border = '#A7C2D4';
          color = textCharcoal;
        } else if (variant === 'cream') {
          bg = '#FFFDF7';
          border = '#EDF3F7';
          color = textCharcoal;
        }

        renderedBlocks.push(`
          <div style="background-color: ${bg}; border: 1px solid ${border}; border-radius: 12px; padding: 16px 20px; margin: 16px 0; color: ${color}; font-size: 14px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            ${title}
            ${escapeHtml(message)}
          </div>
        `);
        break;
      }

      // 7. Divider Block
      case 'divider': {
        const spacing = data?.spacing || 'md';
        const marginY = spacing === 'sm' ? '16px' : spacing === 'lg' ? '36px' : '24px';
        renderedBlocks.push(`
          <hr style="border: 0; border-top: 1px solid ${borderSoft}; margin: ${marginY} 0;" />
        `);
        break;
      }

      // Legacy header block compatibility
      case 'header': {
        const title = escapeHtml(data.title || '');
        const subtitle = data.subtitle ? `<p style="margin: 6px 0 0 0; font-size: 14px; color: ${textSlate};">${escapeHtml(data.subtitle)}</p>` : '';
        renderedBlocks.push(`
          <div style="text-align: center; padding: 20px 0 16px 0; border-bottom: 1px solid ${borderSoft}; margin-bottom: 20px;">
            ${data.showLogo !== false ? `<div style="display: inline-block; padding: 6px 14px; background-color: #FBF0F2; color: #9E4D58; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Unwind &amp; Doodle</div>` : ''}
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: ${textCharcoal}; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</h1>
            ${subtitle}
          </div>
        `);
        break;
      }

      // Legacy dynamic recommendation compatibility
      case 'dynamic_recommendation': {
        const token = data.recommendationType === 'personalized' ? '{{personalized_recommendation}}' : '{{product_recommendation}}';
        const heading = data.heading ? `<h4 style="font-size: 14px; font-weight: 700; color: ${textCharcoal}; margin: 0 0 6px 0;">${escapeHtml(data.heading)}</h4>` : '';
        renderedBlocks.push(`
          <div style="margin: 16px 0;">
            ${heading}
            ${token}
          </div>
        `);
        break;
      }
    }
  }

  return renderedBlocks.join('\n');
}

/**
 * Core marketing personalization renderer.
 * Replaces known scalar tokens and dynamic recommendation blocks.
 * Safely handles missing data and sanitizes composite HTML output.
 */
export function renderMarketingTemplate(
  template: string | { blocks?: (CampaignBlock | V1CampaignBlock)[]; html?: string },
  context?: MarketingContext,
  options?: RenderTemplateOptions
): string {
  if (!template) return '';

  let rawTemplateString = '';

  if (typeof template === 'object') {
    if (Array.isArray(template.blocks) && template.blocks.length > 0) {
      rawTemplateString = compileCampaignBlocksToHtml(template.blocks);
    } else if (template.html) {
      rawTemplateString = template.html;
    }
  } else if (typeof template === 'string') {
    // Check if the template string is a JSON string with blocks
    if (template.trim().startsWith('{') && template.includes('"blocks"')) {
      try {
        const parsed = JSON.parse(template);
        if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
          rawTemplateString = compileCampaignBlocksToHtml(parsed.blocks);
        } else if (parsed.html) {
          rawTemplateString = parsed.html;
        } else {
          rawTemplateString = template;
        }
      } catch {
        rawTemplateString = template;
      }
    } else {
      rawTemplateString = template;
    }
  }

  if (!rawTemplateString) return '';

  const isHtml = options?.isHtml ?? true;
  const fallback = options?.fallback ?? '';

  // 1. Prepare scalar replacement values (escaped for HTML)
  const formatScalar = (val?: string | null): string => {
    if (!val || !val.trim()) return fallback;
    const trimmed = val.trim();
    return isHtml ? escapeHtml(trimmed) : trimmed;
  };

  const firstName = formatScalar(context?.firstName);
  const lastName = formatScalar(context?.lastName);
  const email = formatScalar(context?.email);
  const orderNumber = formatScalar(context?.orderNumber);
  const productName = formatScalar(context?.productName);
  const lastProduct = formatScalar(context?.lastProduct);

  // 2. Prepare dynamic recommendation blocks
  const productRecBlock = formatRecommendationBlock(context?.productRecommendation, isHtml);
  const personalizedRecBlock = formatRecommendationBlock(context?.personalizedRecommendation, isHtml);

  // 3. Substitute tokens (case-insensitive)
  let rendered = rawTemplateString
    .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*last_name\s*\}\}/gi, lastName)
    .replace(/\{\{\s*email\s*\}\}/gi, email)
    .replace(/\{\{\s*order_number\s*\}\}/gi, orderNumber)
    .replace(/\{\{\s*product_name\s*\}\}/gi, productName)
    .replace(/\{\{\s*last_product\s*\}\}/gi, lastProduct)
    .replace(/\{\{\s*product_recommendation\s*\}\}/gi, productRecBlock)
    .replace(/\{\{\s*personalized_recommendation\s*\}\}/gi, personalizedRecBlock);

  // 4. If any recommendation block was omitted (empty), clean up empty paragraph artifacts
  if (!productRecBlock) {
    rendered = rendered.replace(/<p>\s*<\/p>/gi, '');
  }
  if (!personalizedRecBlock) {
    rendered = rendered.replace(/<p>\s*<\/p>/gi, '');
  }

  // 5. Run full HTML sanitization on HTML outputs to guarantee safety
  if (isHtml) {
    rendered = sanitizeHtml(rendered);
  }

  return rendered;
}
