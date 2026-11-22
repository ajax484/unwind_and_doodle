import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_HOMEPAGE_CONFIG,
  HomepageConfigSchema,
  normalizeHomepageConfig,
} from '@/types/homepage-settings';
import {
  CreateProductSchema,
  UpdateProductSchema,
  BulkUpdateProductsSchema,
} from '@/types/admin-product';
import { isRetryableUploadStatus } from '@/lib/image-upload-utils';
import {
  fetchCachedAdminReference,
  invalidateAdminReferenceCache,
} from '@/lib/admin-reference-cache';

describe('Tier 2.1 — Homepage Repositioning & Editable Config (CAT-4)', () => {
  it('defaults to the brand-first section order (Hero -> Categories -> Featured -> Custom Keepsake)', () => {
    const order = DEFAULT_HOMEPAGE_CONFIG.sections.map((s) => s.key);
    expect(order).toEqual([
      'hero',
      'categories',
      'featured_products',
      'custom_keepsake',
      'brand_philosophy',
      'reviews',
      'newsletter',
    ]);
    expect(DEFAULT_HOMEPAGE_CONFIG.copy.hero.headlineLead).toBe('A little less scrolling.');
    expect(DEFAULT_HOMEPAGE_CONFIG.copy.hero.headlineRose).toBe('living.');
  });

  it('rejects duplicate section keys in HomepageConfigSchema', () => {
    const dup = {
      ...DEFAULT_HOMEPAGE_CONFIG,
      sections: [
        { key: 'hero', enabled: true },
        { key: 'hero', enabled: false },
      ],
    };
    const parsed = HomepageConfigSchema.safeParse(dup);
    expect(parsed.success).toBe(false);
  });

  it('normalizes partial section lists by appending missing canonical sections', () => {
    const partial = {
      ...DEFAULT_HOMEPAGE_CONFIG,
      sections: [
        { key: 'hero' as const, enabled: true },
        { key: 'featured_products' as const, enabled: false },
      ],
    };
    const normalized = normalizeHomepageConfig(partial);
    expect(normalized.sections.length).toBe(7);
    expect(normalized.sections[0]).toEqual({ key: 'hero', enabled: true });
    expect(normalized.sections[1]).toEqual({ key: 'featured_products', enabled: false });
  });
});

describe('Tier 2.2 — Product Structured Specs Schema (CAT-6)', () => {
  it('accepts structured specs on CreateProductSchema and coerces empty page_count to null', () => {
    const parsed = CreateProductSchema.safeParse({
      name: 'Mindful Florals Coloring Book',
      selling_price: 8500,
      paper_gsm: '120gsm uncoated',
      binding: 'Spiral-bound',
      page_count: 40,
      dimensions: '21 × 21 cm',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.paper_gsm).toBe('120gsm uncoated');
      expect(parsed.data.binding).toBe('Spiral-bound');
      expect(parsed.data.page_count).toBe(40);
      expect(parsed.data.dimensions).toBe('21 × 21 cm');
    }

    const emptyPageCount = UpdateProductSchema.safeParse({ page_count: '' });
    expect(emptyPageCount.success).toBe(true);
    if (emptyPageCount.success) {
      expect(emptyPageCount.data.page_count).toBeNull();
    }
  });

  it('rejects non-positive page_count', () => {
    const parsed = UpdateProductSchema.safeParse({ page_count: 0 });
    expect(parsed.success).toBe(false);
  });
});

describe('Tier 2.3 — Bulk Product Edits, Upload Retry & Reference Cache', () => {
  const validUuid = '11111111-1111-4111-8111-111111111111';

  it('requires at least one change field in BulkUpdateProductsSchema', () => {
    const empty = BulkUpdateProductsSchema.safeParse({ productIds: [validUuid] });
    expect(empty.success).toBe(false);

    const valid = BulkUpdateProductsSchema.safeParse({
      productIds: [validUuid],
      status: 'published',
      priceAdjustment: { mode: 'percent_delta', amount: 10 },
    });
    expect(valid.success).toBe(true);
  });

  it('identifies retryable HTTP statuses for media uploads', () => {
    expect(isRetryableUploadStatus(503)).toBe(true);
    expect(isRetryableUploadStatus(429)).toBe(true);
    expect(isRetryableUploadStatus(408)).toBe(true);
    expect(isRetryableUploadStatus(400)).toBe(false);
    expect(isRetryableUploadStatus(413)).toBe(false);
  });

  it('caches admin reference data and deduplicates in-flight requests', async () => {
    invalidateAdminReferenceCache();
    const fetcher = vi.fn(async () => ['cat-1', 'cat-2']);

    const [a, b] = await Promise.all([
      fetchCachedAdminReference('test-cats', fetcher, 5000),
      fetchCachedAdminReference('test-cats', fetcher, 5000),
    ]);
    expect(a).toEqual(['cat-1', 'cat-2']);
    expect(b).toEqual(['cat-1', 'cat-2']);
    expect(fetcher).toHaveBeenCalledTimes(1);

    const c = await fetchCachedAdminReference('test-cats', fetcher, 5000);
    expect(c).toEqual(['cat-1', 'cat-2']);
    expect(fetcher).toHaveBeenCalledTimes(1);

    invalidateAdminReferenceCache('test-cats');
    await fetchCachedAdminReference('test-cats', fetcher, 5000);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
