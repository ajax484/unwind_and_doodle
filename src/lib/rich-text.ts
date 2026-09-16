import sanitizeHtml from 'sanitize-html';

export const ALLOWED_RICH_TEXT_TAGS = [
  'p',
  'b',
  'i',
  'em',
  'strong',
  'strike',
  's',
  'u',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'a',
  'br',
];

export const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_RICH_TEXT_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href || '';
      const isExternal = href.startsWith('http://') || href.startsWith('https://');
      return {
        tagName: 'a',
        attribs: {
          href,
          target: isExternal ? '_blank' : attribs.target || '_self',
          rel: isExternal ? 'noopener noreferrer' : attribs.rel || '',
        },
      };
    },
  },
};

/**
 * Sanitizes rich text HTML using an allowlist suitable for product descriptions.
 * Strips dangerous tags, script injections, and unwhitelisted attributes.
 */
export function sanitizeRichText(content?: string | null): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  return sanitizeHtml(trimmed, SANITIZE_OPTIONS);
}

/**
 * Strips all HTML tags and unescapes standard HTML entities.
 */
export function stripHtml(htmlOrText?: string | null): string {
  if (!htmlOrText || typeof htmlOrText !== 'string') {
    return '';
  }

  return htmlOrText
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts plain text from an HTML or plain text string, optionally clamping to a maximum length
 * without breaking words where possible.
 */
export function extractPlainText(htmlOrText?: string | null, maxLength?: number): string {
  const plain = stripHtml(htmlOrText);
  if (!plain || !maxLength || plain.length <= maxLength) {
    return plain;
  }

  const truncated = plain.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const cleanCut = lastSpace > maxLength * 0.75 ? truncated.slice(0, lastSpace) : truncated;

  return `${cleanCut}...`;
}

/**
 * Checks whether rich text HTML is effectively empty (e.g., '<p></p>', '<p><br></p>', or whitespace).
 */
export function isRichTextEmpty(html?: string | null): boolean {
  if (!html || typeof html !== 'string') return true;
  return stripHtml(html).length === 0;
}

/**
 * Prepares content for TipTap editor. If content is legacy plain text (contains no HTML tags),
 * converts newlines into proper paragraph blocks.
 */
export function normalizeRichTextForEditor(content?: string | null): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  // If already formatted with HTML tags, return as-is
  if (/<(p|h[1-6]|ul|ol|li|blockquote|div|br)[^>]*>/i.test(trimmed)) {
    return trimmed;
  }

  // Convert legacy plain text: split double newlines into paragraphs, single newlines into <br>
  return trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br />')}</p>`)
    .join('');
}
