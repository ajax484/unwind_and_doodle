import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/services/admin-product.service';

describe('Admin Category Management (CRUD & Storefront Metadata)', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-other-store-02';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Other Store' },
      ],
      categories: [
        {
          id: 'cat-books',
          organization_id: orgA,
          name: 'Coloring Books',
          slug: 'coloring-books',
          description: 'Mindful coloring books on archival paper',
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'cat-journals',
          organization_id: orgA,
          name: 'Guided Journals',
          slug: 'journals',
          description: 'Gentle prompts for peaceful reflection',
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'cat-other-org',
          organization_id: orgB,
          name: 'Other Category',
          slug: 'other-cat',
          description: null,
          created_at: '2026-08-10T10:00:00Z',
        },
      ],
      products: [
        { id: 'prod-1', organization_id: orgA, name: 'Book 1' },
        { id: 'prod-2', organization_id: orgA, name: 'Book 2' },
        { id: 'prod-3', organization_id: orgA, name: 'Journal 1' },
      ],
      product_categories: [
        { product_id: 'prod-1', category_id: 'cat-books' },
        { product_id: 'prod-2', category_id: 'cat-books' },
        { product_id: 'prod-3', category_id: 'cat-journals' },
      ],
      discount_categories: [
        { discount_id: 'disc-1', category_id: 'cat-books' },
      ],
    });
  });

  describe('listCategories', () => {
    it('lists categories scoped to organization sorted alphabetically', async () => {
      const result = await listCategories(mockSupabase as any, orgA);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Coloring Books');
      expect(result[1].name).toBe('Guided Journals');
    });

    it('calculates product_count when includeProductCount is enabled', async () => {
      const result = await listCategories(mockSupabase as any, orgA, {
        includeProductCount: true,
      });
      expect(result).toHaveLength(2);

      const books = result.find((c) => c.id === 'cat-books');
      expect(books?.product_count).toBe(2);

      const journals = result.find((c) => c.id === 'cat-journals');
      expect(journals?.product_count).toBe(1);
    });
  });

  describe('createCategory', () => {
    it('creates a new category with generated slug and description', async () => {
      const newCat = await createCategory(
        mockSupabase as any,
        'Art Pencils',
        orgA,
        { description: 'Fine liners and artist-grade pencils' }
      );

      expect(newCat).toBeDefined();
      expect(newCat.name).toBe('Art Pencils');
      expect(newCat.slug).toBe('art-pencils');
      expect(newCat.description).toBe('Fine liners and artist-grade pencils');
      expect(newCat.organization_id).toBe(orgA);
    });

    it('supports custom slug if provided', async () => {
      const newCat = await createCategory(
        mockSupabase as any,
        'Art Pens & Markers',
        orgA,
        { slug: 'pens-markers' }
      );

      expect(newCat.slug).toBe('pens-markers');
    });

    it('appends unique suffix if base slug already exists in organization', async () => {
      const dupCat = await createCategory(
        mockSupabase as any,
        'Coloring Books',
        orgA
      );

      expect(dupCat.slug).toContain('coloring-books-');
    });
  });

  describe('updateCategory', () => {
    it('updates category name, slug, and description', async () => {
      const updated = await updateCategory(
        mockSupabase as any,
        'cat-books',
        orgA,
        {
          name: 'Mindful Coloring Books',
          slug: 'mindful-coloring-books',
          description: 'Updated premium description',
        }
      );

      expect(updated.name).toBe('Mindful Coloring Books');
      expect(updated.slug).toBe('mindful-coloring-books');
      expect(updated.description).toBe('Updated premium description');
    });

    it('throws error if category does not exist or belongs to another organization', async () => {
      await expect(
        updateCategory(mockSupabase as any, 'cat-other-org', orgA, {
          name: 'Hacked Category',
        })
      ).rejects.toThrow(/Unauthorized/);
    });

    it('throws error on empty category name', async () => {
      await expect(
        updateCategory(mockSupabase as any, 'cat-books', orgA, {
          name: '   ',
        })
      ).rejects.toThrow(/cannot be empty/);
    });

    it('prevents slug collision with another existing category in same organization', async () => {
      await expect(
        updateCategory(mockSupabase as any, 'cat-books', orgA, {
          slug: 'journals', // already used by cat-journals
        })
      ).rejects.toThrow(/already exists/);
    });
  });

  describe('deleteCategory', () => {
    it('deletes category and returns count of detached products and discounts', async () => {
      const result = await deleteCategory(mockSupabase as any, 'cat-books', orgA);

      expect(result.success).toBe(true);
      expect(result.deletedId).toBe('cat-books');
      expect(result.detachedProductCount).toBe(2);
      expect(result.detachedDiscountCount).toBe(1);

      // Verify category is removed from categories list
      const remaining = await listCategories(mockSupabase as any, orgA);
      expect(remaining.find((c) => c.id === 'cat-books')).toBeUndefined();
    });

    it('throws error if category belongs to another organization', async () => {
      await expect(
        deleteCategory(mockSupabase as any, 'cat-other-org', orgA)
      ).rejects.toThrow(/Unauthorized/);
    });

    it('throws error if category not found', async () => {
      await expect(
        deleteCategory(mockSupabase as any, 'non-existent-id', orgA)
      ).rejects.toThrow(/not found/);
    });
  });
});
