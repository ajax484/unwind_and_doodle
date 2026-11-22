import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_STOREFRONT_PAGES,
  STOREFRONT_PAGE_SLUGS,
  UpdateStorefrontPageSchema,
} from '@/types/storefront-pages';
import {
  getStorefrontPage,
  listStorefrontPages,
  upsertStorefrontPage,
} from '@/services/storefront-pages.service';

describe('Tier 1.3 — Storefront Content & Policy Pages CMS (CAT-5, CHK-1)', () => {
  function createMockSupabase(initialRows: Array<Record<string, any>> = []) {
    const rows = [...initialRows];
    return {
      _rows: rows,
      from: vi.fn((table: string) => {
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(async () => ({ data: { id: 'org-1' }, error: null })),
          };
        }
        if (table === 'storefront_pages') {
          let filterOrg: string | null = null;
          let filterSlug: string | null = null;
          const chain: any = {
            select: vi.fn(() => chain),
            eq: vi.fn((col: string, val: string) => {
              if (col === 'organization_id') filterOrg = val;
              if (col === 'slug') filterSlug = val;
              return chain;
            }),
            maybeSingle: vi.fn(async () => {
              const found = rows.find(
                (r) =>
                  (!filterOrg || r.organization_id === filterOrg) &&
                  (!filterSlug || r.slug === filterSlug)
              );
              return { data: found || null, error: null };
            }),
            then: (resolve: any) => {
              const matched = rows.filter((r) => !filterOrg || r.organization_id === filterOrg);
              return resolve({ data: matched, error: null });
            },
            upsert: vi.fn((payload: any) => {
              const idx = rows.findIndex(
                (r) => r.organization_id === payload.organization_id && r.slug === payload.slug
              );
              const saved = { id: `page-${payload.slug}`, ...payload };
              if (idx >= 0) rows[idx] = saved;
              else rows.push(saved);
              return {
                select: vi.fn(() => ({
                  single: vi.fn(async () => ({ data: saved, error: null })),
                })),
              };
            }),
          };
          return chain;
        }
        return {
          insert: vi.fn(async () => ({ error: null })),
        };
      }),
    } as any;
  }

  it('returns default placeholder content for all 5 canonical pages when DB has no rows yet', async () => {
    const supabase = createMockSupabase();
    const pages = await listStorefrontPages(supabase, 'org-1');

    expect(pages.map((p) => p.slug)).toEqual([...STOREFRONT_PAGE_SLUGS]);
    for (const page of pages) {
      expect(page.isDefault).toBe(true);
      expect(page.title).toBe(DEFAULT_STOREFRONT_PAGES[page.slug].title);
    }
  });

  it('persists structured edits via upsertStorefrontPage and immediately serves updated content', async () => {
    const supabase = createMockSupabase();

    const saved = await upsertStorefrontPage(
      supabase,
      'org-1',
      'delivery',
      {
        title: 'Updated Delivery Timelines',
        subtitle: 'Fresh from Admin',
        content: {
          highlights: [{ label: 'Lagos', value: 'Next-day delivery' }],
          sections: [{ heading: 'Custom Books', body: 'Takes 4 working days.' }],
        },
      },
      'admin-user-1'
    );

    expect(saved.isDefault).toBe(false);
    expect(saved.title).toBe('Updated Delivery Timelines');
    expect(saved.content.highlights?.[0].value).toBe('Next-day delivery');

    const loaded = await getStorefrontPage(supabase, 'delivery', 'org-1');
    expect(loaded.isDefault).toBe(false);
    expect(loaded.title).toBe('Updated Delivery Timelines');
    expect(loaded.content.sections[0].heading).toBe('Custom Books');
  });

  it('rejects invalid page payloads via Zod schema', () => {
    const invalid = UpdateStorefrontPageSchema.safeParse({
      title: '',
      content: { sections: [{ heading: '', body: 'Missing heading' }] },
    });
    expect(invalid.success).toBe(false);
  });
});
