/**
 * HTML Sanitization and Personalization utility for marketing email campaigns.
 *
 * Enforces safe HTML rendering without introducing heavy third-party dependencies.
 * Strips script tags, iframe/embed tags, forms, event handlers, and javascript: links,
 * while allowing safe email markup (paragraphs, headings, lists, links, inline formatting).
 */

const ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'a',
  'ul',
  'ol',
  'li',
  'br',
  'hr',
  'div',
  'span',
  'blockquote',
  'code',
  'pre',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  div: new Set(['class', 'style']),
  span: new Set(['class', 'style']),
  p: new Set(['class', 'style']),
  h1: new Set(['class', 'style']),
  h2: new Set(['class', 'style']),
  h3: new Set(['class', 'style']),
  h4: new Set(['class', 'style']),
  table: new Set(['class', 'style', 'border', 'cellpadding', 'cellspacing', 'width']),
  td: new Set(['class', 'style', 'align', 'valign', 'width']),
  th: new Set(['class', 'style', 'align', 'valign', 'width']),
};

/**
 * Validates whether an attribute value is safe (e.g. preventing javascript: or vbscript: URLs).
 */
function isSafeAttributeValue(attrName: string, value: string): boolean {
  const normalized = value.trim().toLowerCase();

  if (attrName === 'href' || attrName === 'src') {
    // Disallow javascript: and data: URIs for safety
    if (
      normalized.startsWith('javascript:') ||
      normalized.startsWith('vbscript:') ||
      normalized.startsWith('data:')
    ) {
      return false;
    }
    // Allow http, https, mailto, tel, or relative URLs
    return (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('mailto:') ||
      normalized.startsWith('tel:') ||
      normalized.startsWith('/') ||
      normalized.startsWith('#')
    );
  }

  // Prevent inline style expressions or url() injections
  if (attrName === 'style') {
    if (normalized.includes('expression(') || normalized.includes('javascript:') || normalized.includes('url(')) {
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Sanitizes an HTML string by removing dangerous tags, malicious attributes, and event handlers.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  // 1. Remove dangerous blocks completely (scripts, iframes, styles, objects, embeds)
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ''); // Remove comments

  // 2. Parse tags and sanitize attributes
  clean = clean.replace(/<\/?([a-zA-Z0-9_-]+)([^>]*)>/g, (match, tagName: string, attrString: string) => {
    const lowerTag = tagName.toLowerCase();

    // If tag is not in allowlist, strip the tag markup entirely
    if (!ALLOWED_TAGS.has(lowerTag)) {
      return '';
    }

    // Closing tag
    if (match.startsWith('</')) {
      return `</${lowerTag}>`;
    }

    // Opening or self-closing tag: parse attributes
    const allowedTagAttrs = ALLOWED_ATTRIBUTES[lowerTag] || new Set();
    const sanitizedAttrs: string[] = [];

    // Attribute regex matching attr="val", attr='val', or attr=val
    const attrRegex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Immediately reject all event handlers (on*)
      if (attrName.startsWith('on')) {
        continue;
      }

      // Check allowlist for this tag
      if (allowedTagAttrs.has(attrName)) {
        if (isSafeAttributeValue(attrName, attrVal)) {
          // Escape quotes in attribute value
          const escapedVal = attrVal.replace(/"/g, '&quot;');
          sanitizedAttrs.push(`${attrName}="${escapedVal}"`);
        }
      }
    }

    // If tag is anchor <a>, ensure rel="noopener noreferrer"
    if (lowerTag === 'a') {
      if (!sanitizedAttrs.some((a) => a.startsWith('rel='))) {
        sanitizedAttrs.push('rel="noopener noreferrer"');
      }
      if (!sanitizedAttrs.some((a) => a.startsWith('target='))) {
        sanitizedAttrs.push('target="_blank"');
      }
    }

    const attrsSerialized = sanitizedAttrs.length > 0 ? ` ${sanitizedAttrs.join(' ')}` : '';
    const isSelfClosing = match.endsWith('/>') || lowerTag === 'br' || lowerTag === 'hr';
    return `<${lowerTag}${attrsSerialized}${isSelfClosing ? ' />' : '>'}`;
  });

  return clean;
}

export interface PersonalizationData {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

/**
 * Replaces personalization tags such as {{first_name}} and {{last_name}} with customer data.
 * Safely defaults missing values (e.g. empty string or provided fallback).
 */
export function replacePersonalizationTags(
  template: string,
  data?: PersonalizationData,
  options?: { fallback?: string }
): string {
  if (!template || typeof template !== 'string') return '';

  const fallback = options?.fallback ?? '';

  return template
    .replace(/\{\{\s*first_name\s*\}\}/gi, data?.first_name?.trim() || fallback)
    .replace(/\{\{\s*last_name\s*\}\}/gi, data?.last_name?.trim() || fallback)
    .replace(/\{\{\s*email\s*\}\}/gi, data?.email?.trim() || fallback);
}
