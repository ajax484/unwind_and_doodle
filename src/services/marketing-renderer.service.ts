import { MarketingContext, MarketingRecommendation } from '@/types/marketing-context';
import { sanitizeHtml } from '@/lib/sanitize-html';

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
    return `<p class="recommendation-block">${escapeHtml(text)}</p>`;
  }

  return text;
}

/**
 * Core marketing personalization renderer.
 * Replaces known scalar tokens and dynamic recommendation blocks.
 * Safely handles missing data and sanitizes composite HTML output.
 */
export function renderMarketingTemplate(
  template: string,
  context?: MarketingContext,
  options?: RenderTemplateOptions
): string {
  if (!template || typeof template !== 'string') return '';

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
  let rendered = template
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
