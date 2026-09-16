import { describe, it, expect } from 'vitest';
import {
  sanitizeRichText,
  stripHtml,
  extractPlainText,
  isRichTextEmpty,
  normalizeRichTextForEditor,
} from '@/lib/rich-text';

describe('rich-text utilities', () => {
  describe('sanitizeRichText', () => {
    it('returns empty string for null, undefined, or empty values', () => {
      expect(sanitizeRichText(null)).toBe('');
      expect(sanitizeRichText(undefined)).toBe('');
      expect(sanitizeRichText('')).toBe('');
      expect(sanitizeRichText('   ')).toBe('');
    });

    it('preserves allowed HTML tags and structures', () => {
      const html = '<p>Hello <strong>bold</strong> <em>italic</em> <s>strike</s></p><h2>Heading 2</h2><h3>Heading 3</h3><ul><li>Bullet 1</li></ul><ol><li>Item 1</li></ol><blockquote>Quote</blockquote><hr />';
      const sanitized = sanitizeRichText(html);
      expect(sanitized).toContain('<strong>bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
      expect(sanitized).toContain('<s>strike</s>');
      expect(sanitized).toContain('<h2>Heading 2</h2>');
      expect(sanitized).toContain('<h3>Heading 3</h3>');
      expect(sanitized).toContain('<ul><li>Bullet 1</li></ul>');
      expect(sanitized).toContain('<ol><li>Item 1</li></ol>');
      expect(sanitized).toContain('<blockquote>Quote</blockquote>');
      expect(sanitized).toContain('<hr />');
    });

    it('strips script tags and dangerous handlers', () => {
      const malicious = '<p>Good text</p><script>alert("hack")</script><img src="x" onerror="alert(1)"><div onclick="alert(2)">Click me</div>';
      const sanitized = sanitizeRichText(malicious);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('<p>Good text</p>');
    });

    it('sanitizes links and adds noopener noreferrer for external links', () => {
      const links = '<p><a href="https://example.com" target="_blank">External</a> and <a href="javascript:alert(1)">Evil</a></p>';
      const sanitized = sanitizeRichText(links);
      expect(sanitized).toContain('href="https://example.com"');
      expect(sanitized).toContain('rel="noopener noreferrer"');
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('stripHtml', () => {
    it('strips HTML tags and unescapes entities', () => {
      const html = '<p>Hello <strong>World</strong> &amp; friends &lt;3&nbsp;here!</p>';
      expect(stripHtml(html)).toBe('Hello World & friends <3 here!');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(stripHtml(null)).toBe('');
      expect(stripHtml(undefined)).toBe('');
      expect(stripHtml('')).toBe('');
    });
  });

  describe('extractPlainText', () => {
    it('returns full plain text if within maxLength', () => {
      const html = '<p>Short description</p>';
      expect(extractPlainText(html, 50)).toBe('Short description');
    });

    it('truncates cleanly with ellipsis when exceeding maxLength', () => {
      const text = 'The quick brown fox jumps over the lazy dog repeatedly until evening comes.';
      const truncated = extractPlainText(text, 35);
      expect(truncated.endsWith('...')).toBe(true);
      expect(truncated.length).toBeLessThanOrEqual(40);
      expect(truncated).toBe('The quick brown fox jumps over the...');
    });
  });

  describe('isRichTextEmpty', () => {
    it('accurately identifies empty markup', () => {
      expect(isRichTextEmpty('')).toBe(true);
      expect(isRichTextEmpty(null)).toBe(true);
      expect(isRichTextEmpty('<p></p>')).toBe(true);
      expect(isRichTextEmpty('<p>   </p>')).toBe(true);
      expect(isRichTextEmpty('<p><br></p>')).toBe(true);
      expect(isRichTextEmpty('<p>&nbsp;</p>')).toBe(true);
      expect(isRichTextEmpty('<p>Has text</p>')).toBe(false);
    });
  });

  describe('normalizeRichTextForEditor', () => {
    it('leaves existing HTML intact', () => {
      const html = '<p>Already HTML content</p>';
      expect(normalizeRichTextForEditor(html)).toBe(html);
    });

    it('converts legacy plain text with double newlines into paragraphs', () => {
      const plain = 'First paragraph.\n\nSecond paragraph with single\nline break.';
      const normalized = normalizeRichTextForEditor(plain);
      expect(normalized).toBe('<p>First paragraph.</p><p>Second paragraph with single<br />line break.</p>');
    });
  });
});
