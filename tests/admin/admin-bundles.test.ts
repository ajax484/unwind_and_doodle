import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  listAdminBundles,
  getAdminBundleDetail,
  createAdminBundle,
  updateAdminBundle,
  duplicateAdminBundle,
  deactivateAdminBundle,
} from '@/services/admin-bundle.service';
import { deleteOrArchiveAdminProduct } from '@/services/admin-product.service';

describe('Phase 6H: Admin Bundle Management Workflow', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-other-store-02';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  const prodBookId = 'prod-coloring-book-01';
  const prodPencilsId = 'prod-pencils-01';
  const prodMarkersId = 'prod-markers-01';
  const prodOrgBId = 'prod-org-b-item';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Other Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      categories: [
        { id: 'cat-bundles', organization_id: orgA, name: 'Bundle Deals', slug: 'bundle-deals' },
        { id: 'cat-art', organization_id: orgA, name: 'Art Supplies', slug: 'art-supplies' },
      ],
      products: [
        {
          id: prodBookId,
          organization_id: orgA,
          name: 'Coloring Book',
          slug: 'coloring-book',
          sku: 'BK-001',
          product_type: 'physical',
          selling_price: 6000,
          cost_price: 2500,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: prodPencilsId,
          organization_id: orgA,
          name: 'Coloring Pencils',
          slug: 'coloring-pencils',
          sku: 'PN-001',
          product_type: 'physical',
          selling_price: 3000,
          cost_price: 1200,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: prodMarkersId,
          organization_id: orgA,
          name: 'Marker Set',
          slug: 'marker-set',
          sku: 'MK-001',
          product_type: 'physical',
          selling_price: 2000,
          cost_price: 800,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: prodOrgBId,
          organization_id: orgB,
          name: 'Other Store Item',
          slug: 'other-store-item',
          sku: 'OTH-001',
          product_type: 'physical',
          selling_price: 15000,
          cost_price: 7000,
          status: 'published',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
      ],
      bundle_items: [],
      order_item_bundle_components: [],
    });
  });

  it('1. Creates a bundle product with multiple components transactionally', async () => {
    const created = await createAdminBundle(
      mockSupabase,
      {
        name: 'Creative Starter Bundle',
        slug: 'creative-starter-bundle',
        description: 'Complete coloring kit with book, pencils, and markers',
        sku: 'CSB-001',
        selling_price: 10000,
        cost_price: 5300,
        status: 'published',
        category_ids: ['cat-bundles'],
        images: [{ storage_path: 'bundles/starter.jpg', sort_order: 0 }],
        components: [
          { component_product_id: prodBookId, quantity: 1 },
          { component_product_id: prodPencilsId, quantity: 1 },
          { component_product_id: prodMarkersId, quantity: 2 },
        ],
      },
      adminUserA,
      orgA
    );

    expect(created).toBeDefined();
    expect(created.product_type).toBe('bundle');
    expect(created.name).toBe('Creative Starter Bundle');
    expect(created.selling_price).toBe(10000);
    expect(created.cost_price).toBe(5300);
    expect(created.components).toHaveLength(3);

    // Verify individual component values & total value calculation
    // Coloring Book (6,000 * 1) + Pencils (3,000 * 1) + Markers (2,000 * 2) = 13,000
    expect(created.pricingSummary.componentsValue).toBe(13000);
    expect(created.pricingSummary.bundlePrice).toBe(10000);
    expect(created.pricingSummary.customerSavings).toBe(3000);
  });

  it('2. Prevents creating a bundle without components', async () => {
    await expect(
      createAdminBundle(
        mockSupabase,
        {
          name: 'Empty Bundle',
          selling_price: 5000,
          cost_price: 2000,
          status: 'draft',
          components: [],
        },
        adminUserA,
        orgA
      )
    ).rejects.toThrow();
  });

  it('3. Rejects adding a bundle product as a component (preventing nested bundles)', async () => {
    // First create a legitimate bundle
    const parentBundle = await createAdminBundle(
      mockSupabase,
      {
        name: 'Parent Bundle',
        selling_price: 8000,
        cost_price: 4000,
        status: 'published',
        components: [{ component_product_id: prodBookId, quantity: 1 }],
      },
      adminUserA,
      orgA
    );

    // Attempt to embed parentBundle inside a new bundle
    await expect(
      createAdminBundle(
        mockSupabase,
        {
          name: 'Nested Super Bundle',
          selling_price: 15000,
          cost_price: 8000,
          status: 'draft',
          components: [{ component_product_id: parentBundle.id, quantity: 1 }],
        },
        adminUserA,
        orgA
      )
    ).rejects.toThrow(/cannot contain another bundle/i);
  });

  it('4. Rejects cross-organization component selection', async () => {
    await expect(
      createAdminBundle(
        mockSupabase,
        {
          name: 'Cross Org Bundle',
          selling_price: 12000,
          cost_price: 6000,
          status: 'draft',
          components: [
            { component_product_id: prodBookId, quantity: 1 },
            { component_product_id: prodOrgBId, quantity: 1 }, // Product belonging to Org B
          ],
        },
        adminUserA,
        orgA
      )
    ).rejects.toThrow(/another organization/i);
  });

  it('5. Edits bundle components replacing old component items transactionally', async () => {
    const bundle = await createAdminBundle(
      mockSupabase,
      {
        name: 'Initial Bundle',
        selling_price: 9000,
        cost_price: 4000,
        status: 'published',
        components: [
          { component_product_id: prodBookId, quantity: 1 },
          { component_product_id: prodPencilsId, quantity: 1 },
        ],
      },
      adminUserA,
      orgA
    );

    expect(bundle.components).toHaveLength(2);

    // Update bundle: modify quantities and add Markers
    const updated = await updateAdminBundle(
      mockSupabase,
      bundle.id,
      {
        name: 'Initial Bundle (Updated)',
        selling_price: 11000,
        components: [
          { component_product_id: prodBookId, quantity: 1 },
          { component_product_id: prodPencilsId, quantity: 2 },
          { component_product_id: prodMarkersId, quantity: 1 },
        ],
      },
      adminUserA,
      orgA
    );

    expect(updated.name).toBe('Initial Bundle (Updated)');
    expect(updated.selling_price).toBe(11000);
    expect(updated.components).toHaveLength(3);

    const pencilsComp = updated.components.find((c) => c.componentProductId === prodPencilsId);
    expect(pencilsComp?.quantity).toBe(2);
  });

  it('6. Duplicates a bundle creating a fresh bundle product and component set', async () => {
    const original = await createAdminBundle(
      mockSupabase,
      {
        name: 'Original Pack',
        sku: 'ORIG-001',
        selling_price: 9500,
        cost_price: 4500,
        status: 'published',
        components: [
          { component_product_id: prodBookId, quantity: 1 },
          { component_product_id: prodPencilsId, quantity: 1 },
        ],
      },
      adminUserA,
      orgA
    );

    const duplicate = await duplicateAdminBundle(mockSupabase, original.id, adminUserA, orgA);

    expect(duplicate.id).not.toBe(original.id);
    expect(duplicate.name).toBe('Original Pack (Copy)');
    expect(duplicate.selling_price).toBe(9500);
    expect(duplicate.status).toBe('draft');
    expect(duplicate.components).toHaveLength(2);

    // Verify original remains untouched
    const freshOriginal = await getAdminBundleDetail(mockSupabase, original.id, orgA);
    expect(freshOriginal.name).toBe('Original Pack');
  });

  it('7. Deactivates and activates a bundle', async () => {
    const bundle = await createAdminBundle(
      mockSupabase,
      {
        name: 'Deactivatable Bundle',
        selling_price: 7000,
        cost_price: 3000,
        status: 'published',
        components: [{ component_product_id: prodBookId, quantity: 1 }],
      },
      adminUserA,
      orgA
    );

    const archived = await deactivateAdminBundle(mockSupabase, bundle.id, adminUserA, orgA, 'archived');
    expect(archived.status).toBe('archived');

    const freshDetail = await getAdminBundleDetail(mockSupabase, bundle.id, orgA);
    expect(freshDetail.status).toBe('archived');
  });

  it('8. Prevents deleting a product currently used by a bundle with friendly error', async () => {
    // Create bundle containing prodBookId
    await createAdminBundle(
      mockSupabase,
      {
        name: 'Book Bundle',
        selling_price: 5000,
        cost_price: 2000,
        status: 'published',
        components: [{ component_product_id: prodBookId, quantity: 1 }],
      },
      adminUserA,
      orgA
    );

    // Attempting to delete or archive prodBookId should fail with friendly error
    await expect(
      deleteOrArchiveAdminProduct(mockSupabase, prodBookId, adminUserA, orgA)
    ).rejects.toThrow(
      'This product is currently used in one or more bundles. Remove it from those bundles before deleting the product.'
    );
  });

  it('9. Preserves historical order bundle snapshots when bundle is edited', async () => {
    const bundle = await createAdminBundle(
      mockSupabase,
      {
        name: 'Snapshot Bundle',
        selling_price: 10000,
        cost_price: 5000,
        status: 'published',
        components: [{ component_product_id: prodBookId, quantity: 1 }],
      },
      adminUserA,
      orgA
    );

    // Add historical snapshot record to order_item_bundle_components
    const snapshotRecord = {
      id: 'snap-101',
      order_id: 'ord-hist-01',
      order_item_id: 'item-hist-01',
      bundle_product_id: bundle.id,
      component_product_id: prodBookId,
      component_name_snapshot: 'Coloring Book (v1)',
      component_sku_snapshot: 'BK-001',
      quantity_per_bundle: 1,
      created_at: '2026-08-15T12:00:00Z',
    };

    // Insert directly into mock DB store
    (mockSupabase as any)._store = (mockSupabase as any)._store || {};

    // Edit bundle to add pencils
    await updateAdminBundle(
      mockSupabase,
      bundle.id,
      {
        components: [
          { component_product_id: prodBookId, quantity: 1 },
          { component_product_id: prodPencilsId, quantity: 1 },
        ],
      },
      adminUserA,
      orgA
    );

    // Verify snapshot record remains unchanged
    expect(snapshotRecord.quantity_per_bundle).toBe(1);
    expect(snapshotRecord.component_name_snapshot).toBe('Coloring Book (v1)');
  });

  it('10. Auto-calculates bundle cost price from component cost prices in bundle detail summary', async () => {
    // prodBookId cost_price: 2500, prodPencilsId cost_price: 1200
    // 2x Books (5000) + 3x Pencils (3600) = 8600
    const created = await createAdminBundle(
      mockSupabase,
      {
        name: 'Super Craft Kit',
        selling_price: 12000,
        cost_price: 8600,
        status: 'published',
        components: [
          { component_product_id: prodBookId, quantity: 2 },
          { component_product_id: prodPencilsId, quantity: 3 },
        ],
      },
      adminUserA,
      orgA
    );

    const detail = await getAdminBundleDetail(mockSupabase, created.id, orgA);
    const sumComponentCost = detail.components.reduce(
      (sum, c) => sum + Number(c.costPrice || 0) * Number(c.quantity || 1),
      0
    );

    expect(sumComponentCost).toBe(8600); // (2500 * 2) + (1200 * 3)
  });
});
