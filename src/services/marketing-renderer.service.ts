import { MarketingContext, MarketingRecommendation } from '@/types/marketing-context';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { stripHtml } from '@/lib/rich-text';
import { CampaignBlock } from '@/types/marketing';
import { V1CampaignBlock, normalizeProductPresentation } from '@/types/marketing-builder';
import { formatPrice } from '@/lib/format-utils';

/**
 * Resolves the authoritative base URL for absolute email links and assets.
 */
export function getBaseSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.SITE_URL ||
    process.env.APP_URL;

  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return 'https://unwindanddoodle.com';
}

/**
 * Converts a relative path or partial link to a fully qualified absolute URL for email clients.
 */
export function toAbsoluteUrl(pathOrUrl?: string | null): string {
  if (!pathOrUrl) return '#';
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return '#';
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  const baseUrl = getBaseSiteUrl();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${baseUrl}${cleanPath}`;
}

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

  // Top Centered Brand Logo (hosted on Supabase Storage)
  renderedBlocks.push(`
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
      <tr>
        <td align="center" style="text-align: center; padding: 12px 0 6px 0;">
          <a href="${toAbsoluteUrl('/')}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block;">
            <img src="https://pexeuungdxbvcqtktwww.supabase.co/storage/v1/object/public/assets/logo.svg" alt="Unwind &amp; Doodle" width="48" height="48" style="width: 48px; height: 48px; display: block; margin: 0 auto; border: 0;" />
          </a>
        </td>
      </tr>
      <tr>
        <td align="center" style="text-align: center; padding: 0 0 10px 0;">
          <div style="display: inline-block; padding: 4px 12px; background-color: #FBF0F2; color: #9E4D58; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Unwind &amp; Doodle</div>
        </td>
      </tr>
    </table>
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
      // 2. Image Block
      case 'image': {
        const url = data.url ? toAbsoluteUrl(data.url) : '';
        if (url) {
          const alt = escapeHtml(data.altText || data.alt || 'Campaign Image');
          const align = data.align || 'center';
          const maxWidth = data.width === 'constrained' ? '360px' : '560px';
          const imgTag = `<img src="${escapeHtml(url)}" alt="${alt}" style="width: 100%; max-width: ${maxWidth}; height: auto; display: block; border-radius: 12px; border: 1px solid ${borderSoft}; margin: ${align === 'center' ? '0 auto' : align === 'right' ? '0 0 0 auto' : '0 auto 0 0'};" />`;
          const captionTag = data.caption ? `<p style="font-size: 12px; color: ${textSlate}; text-align: ${align}; margin-top: 6px; margin-bottom: 0;">${escapeHtml(data.caption)}</p>` : '';

          if (data.linkUrl) {
            const absoluteLink = toAbsoluteUrl(data.linkUrl);
            renderedBlocks.push(`
              <div style="margin: 20px 0; text-align: ${align};">
                <a href="${escapeHtml(absoluteLink)}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; width: 100%;">
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
        const item = normalizeProductPresentation(data);
        const { image, badge, title, description, price, cta, _catalogSnapshot } = item;

        const displayTitle = escapeHtml(title?.text || _catalogSnapshot?.title || 'Featured Product');
        const displayPrice = _catalogSnapshot?.price ?? data.price;
        const priceStr =
          displayPrice !== undefined && displayPrice !== null
            ? (typeof displayPrice === 'number' ? formatPrice(displayPrice) : escapeHtml(String(displayPrice)))
            : '';

        const badgeHtml =
          badge?.visible && badge.text
            ? `<span style="display: inline-block; padding: 3px 8px; background-color: #FBF0F2; color: #9E4D58; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 6px;">${escapeHtml(badge.text)}</span>`
            : '';

        const showTitle = title?.visible !== false;
        const titleHtml = showTitle
          ? `<div style="font-size: 16px; font-weight: 700; color: ${textCharcoal}; margin-bottom: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${displayTitle}</div>`
          : '';

        const rawDesc = description?.text || _catalogSnapshot?.description || '';
        const cleanDesc = stripHtml(rawDesc);
        const showDesc = description?.visible !== false && Boolean(cleanDesc);
        const descHtml = showDesc
          ? `<p style="font-size: 13px; color: ${textSlate}; margin: 0 0 8px 0; line-height: 1.5;">${escapeHtml(cleanDesc)}</p>`
          : '';

        const showPrice = price?.visible !== false && Boolean(priceStr);
        const priceHtml = showPrice
          ? `<div style="font-size: 15px; font-weight: 800; color: ${brandRose}; margin-bottom: 12px;">${priceStr}</div>`
          : '';

        const showCta = cta?.visible !== false;
        const ctaBtnText = escapeHtml(cta?.text || data.ctaText || 'Shop now');
        let ctaTargetUrl = '#';
        if (cta?.destination?.type === 'custom' && cta.destination.url) {
          ctaTargetUrl = toAbsoluteUrl(cta.destination.url);
        } else if (_catalogSnapshot?.slug || data.slug) {
          ctaTargetUrl = toAbsoluteUrl(`/products/${_catalogSnapshot?.slug || data.slug}`);
        } else if (data.ctaUrl) {
          ctaTargetUrl = toAbsoluteUrl(data.ctaUrl);
        }

        const ctaHtml = showCta
          ? `<a href="${escapeHtml(ctaTargetUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: ${brandRose}; color: #ffffff !important; text-decoration: none; padding: 8px 18px; border-radius: 8px; font-size: 12px; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${ctaBtnText}</a>`
          : '';

        const rawImageUrl = image?.url || _catalogSnapshot?.imageUrl || data.imageUrl;
        const imageUrl = rawImageUrl ? toAbsoluteUrl(rawImageUrl) : '';

        renderedBlocks.push(`
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid ${borderSoft}; border-radius: 14px; overflow: hidden; background-color: #FFFDF7; margin: 20px 0;">
            <tr>
              ${imageUrl ? `
                <td width="140" valign="middle" style="padding: 16px; width: 140px; text-align: center;">
                  <img src="${escapeHtml(imageUrl)}" alt="${displayTitle}" width="120" style="width: 120px; height: auto; max-height: 120px; border-radius: 10px; display: block; object-fit: cover; border: 1px solid ${borderSoft}; margin: 0 auto;" />
                </td>
              ` : ''}
              <td valign="middle" style="padding: 16px 20px;">
                ${badgeHtml}
                ${titleHtml}
                ${descHtml}
                ${priceHtml}
                ${ctaHtml}
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
        const rawItems = data.products || [];

        if (rawItems.length > 0) {
          const rows: string[] = [];
          for (let i = 0; i < rawItems.length; i += 2) {
            const pair = rawItems.slice(i, i + 2);
            const cells = pair.map((rawItem: any) => {
              const item = normalizeProductPresentation(rawItem);
              const { image, badge, title, description, price, cta, _catalogSnapshot } = item;

              const itemTitle = escapeHtml(title?.text || _catalogSnapshot?.title || 'Product');
              const itemPrice = _catalogSnapshot?.price ?? rawItem.price;
              const itemPriceStr =
                itemPrice !== undefined && itemPrice !== null
                  ? (typeof itemPrice === 'number' ? formatPrice(itemPrice) : escapeHtml(String(itemPrice)))
                  : '';

              let itemUrl = '#';
              if (cta?.destination?.type === 'custom' && cta.destination.url) {
                itemUrl = toAbsoluteUrl(cta.destination.url);
              } else if (_catalogSnapshot?.slug || rawItem.slug) {
                itemUrl = toAbsoluteUrl(`/products/${_catalogSnapshot?.slug || rawItem.slug}`);
              } else if (rawItem.url) {
                itemUrl = toAbsoluteUrl(rawItem.url);
              }

              const rawImg = image?.url || _catalogSnapshot?.imageUrl || rawItem.imageUrl;
              const itemImg = rawImg ? toAbsoluteUrl(rawImg) : '';
              const itemBadge = badge?.visible && badge.text ? escapeHtml(badge.text) : '';
              const rawItemDesc = description?.text || _catalogSnapshot?.description || '';
              const cleanItemDesc = stripHtml(rawItemDesc);
              const itemDesc = description?.visible && cleanItemDesc ? escapeHtml(cleanItemDesc) : '';
              const showItemPrice = price?.visible !== false && Boolean(itemPriceStr);
              const showItemCta = cta?.visible !== false;
              const itemCtaText = escapeHtml(cta?.text || 'View Item');

              return `
                <td width="50%" valign="top" style="padding: 8px; width: 50%;">
                  <div style="border: 1px solid ${borderSoft}; border-radius: 12px; padding: 12px; background-color: #ffffff; text-align: center; height: 100%;">
                    ${itemBadge ? `<div style="text-align: left; margin-bottom: 6px;"><span style="display: inline-block; padding: 2px 6px; background-color: #FBF0F2; color: #9E4D58; border-radius: 4px; font-size: 10px; font-weight: 700;">${itemBadge}</span></div>` : ''}
                    ${itemImg ? `<img src="${escapeHtml(itemImg)}" alt="${itemTitle}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; display: block;" />` : ''}
                    ${title?.visible !== false ? `<div style="font-size: 13px; font-weight: 700; color: ${textCharcoal}; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${itemTitle}</div>` : ''}
                    ${itemDesc ? `<p style="font-size: 11px; color: ${textSlate}; margin: 0 0 6px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${itemDesc}</p>` : ''}
                    ${showItemPrice ? `<div style="font-size: 13px; font-weight: 800; color: ${brandRose}; margin-bottom: 8px;">${itemPriceStr}</div>` : ''}
                    ${showItemCta ? `
                      <a href="${escapeHtml(itemUrl)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #FBF0F2; color: #9E4D58 !important; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700;">
                        ${itemCtaText}
                      </a>
                    ` : ''}
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
        const url = escapeHtml(toAbsoluteUrl(data.url || '#'));
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

  const innerContentHtml = renderedBlocks.join('\n');

  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100% !important; min-width: 100%; background-color: #F8F9FA; margin: 0; padding: 24px 0 32px 0;">
  <tr>
    <td align="center" valign="top" style="padding: 0 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #EDF3F7; overflow: hidden; margin: 0 auto; text-align: left; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
        <tr>
          <td style="padding: 24px 24px 32px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            ${innerContentHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim();
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
