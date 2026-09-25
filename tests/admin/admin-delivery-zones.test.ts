import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  listWarehouseDeliveryZones,
  createDeliveryZoneAtomic,
  bulkCreateDeliveryZones,
  deleteDeliveryZone,
  updateDeliveryZoneRate,
  listDeliveryRateTemplates,
  createDeliveryRateTemplate,
  updateDeliveryRateTemplate,
  deleteDeliveryRateTemplate,
  listEnrichedDeliveryLocations,
  createLocation,
  updateLocation,
  deleteLocation,
} from '@/services/admin-warehouse.service';
import { resolveDeliveryFee } from '@/services/pricing.service';

describe('Warehouse-Centric Delivery Zones Experience', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-competitor-02';

  const adminUserA = 'usr-admin-ada';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Competitor Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
      ],
      warehouses: [
        {
          id: 'wh-lagos',
          organization_id: orgA,
          name: 'Lagos Mainland Hub',
          state: 'Lagos',
          lga: 'Ikeja',
          address_line_1: '10 Commercial Road',
          active: true,
          created_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'wh-abuja',
          organization_id: orgA,
          name: 'Abuja Depot',
          state: 'FCT Abuja',
          lga: 'Garki',
          active: true,
          created_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'wh-org-b',
          organization_id: orgB,
          name: 'Other Org Warehouse',
          state: 'Rivers',
          active: true,
          created_at: '2026-08-01T10:00:00Z',
        },
      ],
      locations: [
        { id: 'loc-vi', organization_id: orgA, name: 'Victoria Island', state: 'Lagos', lga: 'Eti-Osa', created_at: '2026-08-01T10:00:00Z' },
        { id: 'loc-ikeja', organization_id: orgA, name: 'Ikeja Central', state: 'Lagos', lga: 'Ikeja', created_at: '2026-08-01T10:00:00Z' },
        { id: 'loc-lekki', organization_id: orgA, name: 'Lekki Phase 1', state: 'Lagos', lga: 'Eti-Osa', created_at: '2026-08-02T10:00:00Z' },
        { id: 'loc-yaba', organization_id: orgA, name: 'Yaba Tech Hub', state: 'Lagos', lga: 'Mainland', created_at: '2026-08-02T10:00:00Z' },
        { id: 'loc-garki', organization_id: orgA, name: 'Garki Area 1', state: 'FCT Abuja', lga: 'Garki', created_at: '2026-08-05T10:00:00Z' },
      ],
      warehouse_locations: [
        { warehouse_id: 'wh-lagos', location_id: 'loc-vi' },
        { warehouse_id: 'wh-lagos', location_id: 'loc-ikeja' },
        { warehouse_id: 'wh-abuja', location_id: 'loc-garki' },
      ],
      delivery_rates: [
        { id: 'rate-1', warehouse_id: 'wh-lagos', location_id: 'loc-vi', price: 2500, active: true, created_at: '2026-08-01T10:00:00Z' },
        { id: 'rate-2', warehouse_id: 'wh-lagos', location_id: 'loc-ikeja', price: 1500, active: true, created_at: '2026-08-01T10:00:00Z' },
        { id: 'rate-3', warehouse_id: 'wh-abuja', location_id: 'loc-garki', price: 3000, active: true, created_at: '2026-08-05T10:00:00Z' },
      ],
      delivery_rate_templates: [
        {
          id: 'tmpl-mainland',
          organization_id: orgA,
          name: 'Mainland',
          description: 'Standard mainland rate',
          amount: 2000,
          currency: 'NGN',
          is_active: true,
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'tmpl-island',
          organization_id: orgA,
          name: 'Island',
          description: 'Standard island rate',
          amount: 3000,
          currency: 'NGN',
          is_active: true,
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'tmpl-inactive',
          organization_id: orgA,
          name: 'Old Promo',
          amount: 1000,
          currency: 'NGN',
          is_active: false,
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'tmpl-org-b',
          organization_id: orgB,
          name: 'Competitor Rate',
          amount: 2500,
          currency: 'NGN',
          is_active: true,
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
      ],
    });
  });

  describe('1. Single Atomic Zone Creation', () => {
    it('creates a delivery zone using an existing location in a single step', async () => {
      const zone = await createDeliveryZoneAtomic(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          location_id: 'loc-lekki',
          price: 3000,
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(zone.warehouseId).toBe('wh-lagos');
      expect(zone.locationId).toBe('loc-lekki');
      expect(zone.locationName).toBe('Lekki Phase 1');
      expect(zone.price).toBe(3000);
      expect(zone.active).toBe(true);

      // Verify underlying warehouse_locations assignment was created
      const store = (mockSupabase as any)._store;
      const assigned = store.warehouse_locations.find(
        (wl: any) => wl.warehouse_id === 'wh-lagos' && wl.location_id === 'loc-lekki'
      );
      expect(assigned).toBeDefined();

      // Verify underlying delivery_rates record was created
      const rate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-lekki'
      );
      expect(rate).toBeDefined();
      expect(rate.price).toBe(3000);
    });

    it('creates a new location and delivery zone atomically when location does not exist', async () => {
      const zone = await createDeliveryZoneAtomic(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          name: 'Surulere High Street',
          state: 'Lagos',
          lga: 'Surulere',
          price: 2200,
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(zone.locationName).toBe('Surulere High Street');
      expect(zone.locationState).toBe('Lagos');
      expect(zone.price).toBe(2200);

      const store = (mockSupabase as any)._store;
      // Location was inserted
      const newLoc = store.locations.find((l: any) => l.name === 'Surulere High Street');
      expect(newLoc).toBeDefined();

      // Warehouse location link was inserted
      const wl = store.warehouse_locations.find(
        (l: any) => l.warehouse_id === 'wh-lagos' && l.location_id === newLoc.id
      );
      expect(wl).toBeDefined();

      // Rate was inserted
      const rate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === newLoc.id
      );
      expect(rate?.price).toBe(2200);
    });

    it('updates rate price instead of duplicating when location is already configured', async () => {
      const updated = await createDeliveryZoneAtomic(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          location_id: 'loc-vi', // Already configured with 2500
          price: 2800,
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(updated.price).toBe(2800);

      const store = (mockSupabase as any)._store;
      const rates = store.delivery_rates.filter(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-vi'
      );
      expect(rates.length).toBe(1);
      expect(rates[0].price).toBe(2800);
    });

    it('rejects negative delivery fees', async () => {
      await expect(
        createDeliveryZoneAtomic(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos',
            location_id: 'loc-lekki',
            price: -1000,
            active: true,
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/cannot be negative/i);
    });

    it('enforces multi-tenant authorization', async () => {
      await expect(
        createDeliveryZoneAtomic(
          mockSupabase,
          {
            warehouse_id: 'wh-org-b',
            location_id: 'loc-lekki',
            price: 2000,
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden/i);
    });
  });

  describe('2. Bulk Zone Setup', () => {
    it('configures multiple delivery locations with uniform rate in one batch operation', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          location_ids: ['loc-lekki', 'loc-yaba'],
          price: 2000,
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(result.warehouseId).toBe('wh-lagos');
      expect(result.totalRequested).toBe(2);
      expect(result.created.length).toBe(2);
      expect(result.updated.length).toBe(0);
      expect(result.skipped.length).toBe(0);
      expect(result.failed.length).toBe(0);

      const store = (mockSupabase as any)._store;
      const lekkiRate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-lekki'
      );
      const yabaRate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-yaba'
      );

      expect(lekkiRate?.price).toBe(2000);
      expect(yabaRate?.price).toBe(2000);

      const lekkiWl = store.warehouse_locations.find(
        (wl: any) => wl.warehouse_id === 'wh-lagos' && wl.location_id === 'loc-lekki'
      );
      const yabaWl = store.warehouse_locations.find(
        (wl: any) => wl.warehouse_id === 'wh-lagos' && wl.location_id === 'loc-yaba'
      );

      expect(lekkiWl).toBeDefined();
      expect(yabaWl).toBeDefined();
    });

    it('configures multiple delivery locations with individual rates', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-lekki', price: 3500 },
            { location_id: 'loc-yaba', price: 1800 },
          ],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(2);
      expect(result.created.find((i) => i.locationId === 'loc-lekki')?.price).toBe(3500);
      expect(result.created.find((i) => i.locationId === 'loc-yaba')?.price).toBe(1800);

      const store = (mockSupabase as any)._store;
      expect(
        store.delivery_rates.find((r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-lekki')?.price
      ).toBe(3500);
      expect(
        store.delivery_rates.find((r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-yaba')?.price
      ).toBe(1800);
    });

    it('skips existing configured locations when include_existing is false', async () => {
      // loc-vi is already configured in wh-lagos with price 2500
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-vi', price: 4000 },
            { location_id: 'loc-lekki', price: 2500 },
          ],
          include_existing: false,
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-lekki');
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].locationId).toBe('loc-vi');
      expect(result.skipped[0].action).toBe('skipped');

      const store = (mockSupabase as any)._store;
      // Rate for loc-vi remains 2500, not modified
      const viRate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-vi'
      );
      expect(viRate?.price).toBe(2500);
    });

    it('updates existing delivery rates when include_existing is true', async () => {
      // loc-vi is already configured in wh-lagos with price 2500
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-vi', price: 3200 },
            { location_id: 'loc-lekki', price: 2800 },
          ],
          include_existing: true,
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-lekki');
      expect(result.updated.length).toBe(1);
      expect(result.updated[0].locationId).toBe('loc-vi');
      expect(result.updated[0].price).toBe(3200);

      const store = (mockSupabase as any)._store;
      const viRate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-vi'
      );
      expect(viRate?.price).toBe(3200);
    });

    it('marks rate as skipped if include_existing is true but new price equals old price', async () => {
      // loc-vi has price 2500 already
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [{ location_id: 'loc-vi', price: 2500 }],
          include_existing: true,
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(0);
      expect(result.updated.length).toBe(0);
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].locationId).toBe('loc-vi');
    });

    it('captures invalid items in failed array without blocking valid items', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-non-existent-xyz', price: 2000 },
            { location_id: 'loc-lekki', price: 2500 },
          ],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-lekki');
      expect(result.failed.length).toBe(1);
      expect(result.failed[0].locationId).toBe('loc-non-existent-xyz');
      expect(result.failed[0].error).toMatch(/Location not found/i);
    });
  });

  describe('3. Safe Deletion & Isolation', () => {
    it('safely removes zone and rate without deleting underlying location or warehouse', async () => {
      const store = (mockSupabase as any)._store;
      const initialLocationsCount = store.locations.length;
      const initialWarehousesCount = store.warehouses.length;

      const deleteRes = await deleteDeliveryZone(
        mockSupabase,
        'wh-lagos',
        'loc-vi',
        orgA,
        adminUserA
      );

      expect(deleteRes.success).toBe(true);

      // Rate deleted for this warehouse
      const rate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-vi'
      );
      expect(rate).toBeUndefined();

      // Warehouse-location link deleted
      const wl = store.warehouse_locations.find(
        (l: any) => l.warehouse_id === 'wh-lagos' && l.location_id === 'loc-vi'
      );
      expect(wl).toBeUndefined();

      // CRITICAL: Underlying location and warehouse MUST remain intact
      expect(store.locations.length).toBe(initialLocationsCount);
      expect(store.warehouses.length).toBe(initialWarehousesCount);
      expect(store.locations.find((l: any) => l.id === 'loc-vi')).toBeDefined();
    });
  });

  describe('4. Inline Updates & Listing', () => {
    it('updates delivery zone price and active status', async () => {
      await updateDeliveryZoneRate(
        mockSupabase,
        'wh-lagos',
        'loc-ikeja',
        { price: 1800, active: false },
        orgA,
        adminUserA
      );

      const store = (mockSupabase as any)._store;
      const rate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-ikeja'
      );

      expect(rate?.price).toBe(1800);
      expect(rate?.active).toBe(false);
    });

    it('lists warehouse delivery zones with correct metadata and available unassigned locations', async () => {
      const { zones, availableLocations } = await listWarehouseDeliveryZones(
        mockSupabase,
        'wh-lagos',
        orgA
      );

      // Lagos warehouse currently has 2 assigned zones (loc-vi, loc-ikeja)
      expect(zones.length).toBe(2);
      expect(zones.map((z) => z.locationName)).toContain('Victoria Island');
      expect(zones.map((z) => z.locationName)).toContain('Ikeja Central');

      // Unassigned locations should contain loc-lekki, loc-yaba, loc-garki
      expect(availableLocations.length).toBe(3);
      expect(availableLocations.map((l) => l.id)).toContain('loc-lekki');
      expect(availableLocations.map((l) => l.id)).toContain('loc-yaba');
    });
  });

  describe('5. Delivery Rate Templates CRUD & Tenancy', () => {
    it('creates a new active rate template', async () => {
      const created = await createDeliveryRateTemplate(
        mockSupabase,
        {
          name: 'Outside Lagos',
          description: 'Interstate delivery',
          amount: 5000,
          currency: 'NGN',
          is_active: true,
        },
        adminUserA,
        orgA
      );

      expect(created.name).toBe('Outside Lagos');
      expect(created.amount).toBe(5000);
      expect(created.isActive).toBe(true);
      expect(created.organizationId).toBe(orgA);

      const store = (mockSupabase as any)._store;
      const found = store.delivery_rate_templates.find((t: any) => t.id === created.id);
      expect(found).toBeDefined();
      expect(Number(found.amount)).toBe(5000);
    });

    it('rejects negative template amounts', async () => {
      await expect(
        createDeliveryRateTemplate(
          mockSupabase,
          {
            name: 'Invalid Negative',
            amount: -500,
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/cannot be negative/i);
    });

    it('updates template fields and toggles active status', async () => {
      const updated = await updateDeliveryRateTemplate(
        mockSupabase,
        'tmpl-mainland',
        {
          amount: 2200,
          description: 'Updated mainland pricing',
          is_active: false,
        },
        adminUserA,
        orgA
      );

      expect(updated.amount).toBe(2200);
      expect(updated.description).toBe('Updated mainland pricing');
      expect(updated.isActive).toBe(false);

      const store = (mockSupabase as any)._store;
      const found = store.delivery_rate_templates.find((t: any) => t.id === 'tmpl-mainland');
      expect(Number(found.amount)).toBe(2200);
      expect(found.is_active).toBe(false);
    });

    it('lists templates scoped to organization, respecting activeOnly flag', async () => {
      const allTemplates = await listDeliveryRateTemplates(mockSupabase, orgA, false);
      expect(allTemplates.length).toBe(3); // mainland, island, inactive

      const activeTemplates = await listDeliveryRateTemplates(mockSupabase, orgA, true);
      expect(activeTemplates.length).toBe(2);
      expect(activeTemplates.map((t) => t.name)).toContain('Mainland');
      expect(activeTemplates.map((t) => t.name)).toContain('Island');
      expect(activeTemplates.map((t) => t.name)).not.toContain('Old Promo');
    });

    it('enforces multi-tenant authorization for templates', async () => {
      await expect(
        updateDeliveryRateTemplate(
          mockSupabase,
          'tmpl-org-b', // Belongs to orgB
          { amount: 9999 },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden/i);
    });

    it('safely deletes a template and nullifies delivery_rates references without deleting rates', async () => {
      const store = (mockSupabase as any)._store;
      // Link rate-1 to tmpl-mainland
      store.delivery_rates[0].template_id = 'tmpl-mainland';

      const deleteRes = await deleteDeliveryRateTemplate(
        mockSupabase,
        'tmpl-mainland',
        adminUserA,
        orgA
      );

      expect(deleteRes.success).toBe(true);

      // Template is deleted
      const foundTmpl = store.delivery_rate_templates.find((t: any) => t.id === 'tmpl-mainland');
      expect(foundTmpl).toBeUndefined();

      // Existing rate remains intact with price 2500 and template_id set to null
      const linkedRate = store.delivery_rates.find((r: any) => r.id === 'rate-1');
      expect(linkedRate).toBeDefined();
      expect(linkedRate.price).toBe(2500);
      expect(linkedRate.template_id).toBeNull();
    });
  });

  describe('6. Bulk Setup with Rate Templates', () => {
    it('applies a uniform template to all selected locations with server-side amount resolution', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          template_id: 'tmpl-island', // Island template has amount 3000
          location_ids: ['loc-lekki', 'loc-yaba'],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(2);
      expect(result.created[0].price).toBe(3000);
      expect(result.created[0].templateId).toBe('tmpl-island');
      expect(result.created[0].templateName).toBe('Island');

      const store = (mockSupabase as any)._store;
      const lekkiRate = store.delivery_rates.find(
        (r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-lekki'
      );
      expect(lekkiRate?.price).toBe(3000);
      expect(lekkiRate?.template_id).toBe('tmpl-island');
    });

    it('assigns different templates to different location items in one bulk operation', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-lekki', template_id: 'tmpl-island' }, // Island = 3000
            { location_id: 'loc-yaba', template_id: 'tmpl-mainland' }, // Mainland = 2000
          ],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(2);
      const lekkiResult = result.created.find((i) => i.locationId === 'loc-lekki');
      const yabaResult = result.created.find((i) => i.locationId === 'loc-yaba');

      expect(lekkiResult?.price).toBe(3000);
      expect(lekkiResult?.templateName).toBe('Island');

      expect(yabaResult?.price).toBe(2000);
      expect(yabaResult?.templateName).toBe('Mainland');

      const store = (mockSupabase as any)._store;
      expect(
        store.delivery_rates.find((r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-lekki')?.price
      ).toBe(3000);
      expect(
        store.delivery_rates.find((r: any) => r.warehouse_id === 'wh-lagos' && r.location_id === 'loc-yaba')?.price
      ).toBe(2000);
    });

    it('mixes template-based rates and manual rates within one bulk operation', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-lekki', template_id: 'tmpl-island' }, // Template: 3000
            { location_id: 'loc-yaba', price: 1750 }, // Manual rate: 1750
          ],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(2);
      expect(result.created.find((i) => i.locationId === 'loc-lekki')?.price).toBe(3000);
      expect(result.created.find((i) => i.locationId === 'loc-lekki')?.templateId).toBe('tmpl-island');

      expect(result.created.find((i) => i.locationId === 'loc-yaba')?.price).toBe(1750);
      expect(result.created.find((i) => i.locationId === 'loc-yaba')?.templateId).toBeNull();
    });

    it('rejects inactive templates in bulk setup and reports failure per item', async () => {
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          items: [
            { location_id: 'loc-lekki', template_id: 'tmpl-inactive' },
            { location_id: 'loc-yaba', template_id: 'tmpl-mainland' },
          ],
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-yaba');

      expect(result.failed.length).toBe(1);
      expect(result.failed[0].locationId).toBe('loc-lekki');
      expect(result.failed[0].error).toMatch(/inactive/i);
    });

    it('enforces organization isolation for templates in bulk setup', async () => {
      await expect(
        bulkCreateDeliveryZones(
          mockSupabase,
          {
            warehouse_id: 'wh-lagos',
            template_id: 'tmpl-org-b', // Belongs to orgB
            location_ids: ['loc-lekki'],
          },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden/i);
    });
  });

  describe('7. Checkout Compatibility with Template-Generated Rates', () => {
    it('allows resolveDeliveryFee to calculate checkout shipping fees normally using template-configured rates', async () => {
      // 1. Configure loc-lekki via template Island (3000)
      await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          template_id: 'tmpl-island',
          location_ids: ['loc-lekki'],
        },
        adminUserA,
        orgA
      );

      // 2. Customer checkout queries resolveDeliveryFee
      const feeResult = await resolveDeliveryFee(mockSupabase, 'loc-lekki', 'wh-lagos');

      expect(feeResult.locationId).toBe('loc-lekki');
      expect(feeResult.deliveryFee).toBe(3000);
    });
  });

  describe('8. Smart Delivery Location Selection, Status & Configuration', () => {
    it('enriches locations with cross-warehouse configuration status, pricing, and serving warehouse names', async () => {
      const enriched = await listEnrichedDeliveryLocations(mockSupabase, orgA, 'wh-lagos');

      expect(enriched.length).toBe(5);

      const vi = enriched.find((l) => l.id === 'loc-vi');
      expect(vi).toBeDefined();
      expect(vi?.statusForWarehouse).toBe('configured_here');
      expect(vi?.primaryConfig?.price).toBe(2500);
      expect(vi?.primaryConfig?.warehouseName).toBe('Lagos Mainland Hub');

      const ikeja = enriched.find((l) => l.id === 'loc-ikeja');
      expect(ikeja).toBeDefined();
      expect(ikeja?.statusForWarehouse).toBe('configured_here');
      expect(ikeja?.primaryConfig?.price).toBe(1500);

      const garki = enriched.find((l) => l.id === 'loc-garki');
      expect(garki).toBeDefined();
      expect(garki?.statusForWarehouse).toBe('configured_other');
      expect(garki?.primaryConfig?.warehouseName).toBe('Abuja Depot');
      expect(garki?.primaryConfig?.price).toBe(3000);

      const lekki = enriched.find((l) => l.id === 'loc-lekki');
      expect(lekki).toBeDefined();
      expect(lekki?.statusForWarehouse).toBe('not_configured');
      expect(lekki?.configurations.length).toBe(0);

      const yaba = enriched.find((l) => l.id === 'loc-yaba');
      expect(yaba).toBeDefined();
      expect(yaba?.statusForWarehouse).toBe('not_configured');
      expect(yaba?.configurations.length).toBe(0);
    });

    it('accurately isolates unconfigured locations for the fast path workflow', async () => {
      const enriched = await listEnrichedDeliveryLocations(mockSupabase, orgA, 'wh-lagos');

      const unconfigured = enriched.filter((l) => l.statusForWarehouse === 'not_configured');
      expect(unconfigured.map((u) => u.id).sort()).toEqual(['loc-lekki', 'loc-yaba'].sort());
    });

    it('enables explicit reassignment of a location previously served by another warehouse', async () => {
      // Reassign loc-garki (currently on wh-abuja) to wh-lagos
      const reassigned = await createDeliveryZoneAtomic(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          location_id: 'loc-garki',
          price: 4500,
          active: true,
        },
        adminUserA,
        orgA
      );

      expect(reassigned.locationId).toBe('loc-garki');
      expect(reassigned.warehouseId).toBe('wh-lagos');
      expect(reassigned.price).toBe(4500);

      // When listing enriched locations for wh-lagos, loc-garki now reflects multiple/here status
      const updatedEnriched = await listEnrichedDeliveryLocations(mockSupabase, orgA, 'wh-lagos');
      const garki = updatedEnriched.find((l) => l.id === 'loc-garki');
      expect(garki?.statusForWarehouse).toBe('configured_multiple');
      expect(garki?.configurations.length).toBe(2);
      expect(garki?.configurations.some((c) => c.warehouseId === 'wh-lagos' && c.price === 4500)).toBe(true);
      expect(garki?.configurations.some((c) => c.warehouseId === 'wh-abuja' && c.price === 3000)).toBe(true);
    });

    it('safely handles mixed selection with unconfigured_only mode (preserves existing rates without overwrite)', async () => {
      // loc-vi is configured at 2500, loc-lekki is unconfigured
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          price: 1800,
          location_ids: ['loc-vi', 'loc-lekki'],
          include_existing: false, // Safest default mode
        },
        adminUserA,
        orgA
      );

      // loc-lekki should be created with 1800
      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-lekki');
      expect(result.created[0].price).toBe(1800);

      // loc-vi should be skipped, preserving its 2500 rate
      expect(result.skipped.length).toBe(1);
      expect(result.skipped[0].locationId).toBe('loc-vi');
      expect(result.skipped[0].price).toBe(2500);
      expect(result.skipped[0].reason).toMatch(/already configured/i);

      // Verify loc-vi fee is still 2500
      const viFee = await resolveDeliveryFee(mockSupabase, 'loc-vi', 'wh-lagos');
      expect(viFee.deliveryFee).toBe(2500);
    });

    it('updates existing rates when replace_existing mode is intentionally selected', async () => {
      // loc-ikeja is configured at 1500; replace mode updates it to 2200
      const result = await bulkCreateDeliveryZones(
        mockSupabase,
        {
          warehouse_id: 'wh-lagos',
          price: 2200,
          location_ids: ['loc-ikeja', 'loc-yaba'],
          include_existing: true, // Replace mode
        },
        adminUserA,
        orgA
      );

      expect(result.created.length).toBe(1);
      expect(result.created[0].locationId).toBe('loc-yaba');
      expect(result.created[0].price).toBe(2200);

      expect(result.updated.length).toBe(1);
      expect(result.updated[0].locationId).toBe('loc-ikeja');
      expect(result.updated[0].oldPrice).toBe(1500);
      expect(result.updated[0].price).toBe(2200);

      const ikejaFee = await resolveDeliveryFee(mockSupabase, 'loc-ikeja', 'wh-lagos');
      expect(ikejaFee.deliveryFee).toBe(2200);
    });

    it('creates a new delivery location inline and makes it immediately available for zone assignment', async () => {
      const newLoc = await createLocation(
        mockSupabase,
        {
          name: 'Maryland Mall',
          state: 'Lagos',
          lga: 'Kosofe',
        },
        adminUserA,
        orgA
      );

      expect(newLoc.id).toBeDefined();
      expect(newLoc.name).toBe('Maryland Mall');

      // Now query enriched locations
      const enriched = await listEnrichedDeliveryLocations(mockSupabase, orgA, 'wh-lagos');
      const maryland = enriched.find((l) => l.name === 'Maryland Mall');
      expect(maryland).toBeDefined();
      expect(maryland?.statusForWarehouse).toBe('not_configured');
    });

    it('updates an existing delivery location and records an audit log', async () => {
      const updated = await updateLocation(
        mockSupabase,
        'loc-yaba',
        {
          name: 'Yaba Central Hub',
          state: 'Lagos',
          lga: 'Lagos Mainland',
        },
        adminUserA,
        orgA
      );

      expect(updated.name).toBe('Yaba Central Hub');
      expect(updated.lga).toBe('Lagos Mainland');

      // Verify cross-organization access rejection
      await expect(
        updateLocation(
          mockSupabase,
          'loc-yaba',
          { name: 'Illegal Update' },
          'usr-competitor',
          orgB
        )
      ).rejects.toThrow(/Forbidden/);
    });

    it('deletes a delivery location and cleans up associations safely', async () => {
      // Create temporary location
      const tempLoc = await createLocation(
        mockSupabase,
        {
          name: 'Temporary Zone',
          state: 'Lagos',
        },
        adminUserA,
        orgA
      );

      const deleteRes = await deleteLocation(mockSupabase, tempLoc.id, adminUserA, orgA);
      expect(deleteRes.success).toBe(true);
      expect(deleteRes.id).toBe(tempLoc.id);

      // Verify deletion from database
      const { data: found } = await mockSupabase
        .from('locations')
        .select('*')
        .eq('id', tempLoc.id)
        .maybeSingle();

      expect(found).toBeNull();

      // Verify cross-organization delete is rejected
      await expect(
        deleteLocation(mockSupabase, 'loc-vi', 'usr-competitor', orgB)
      ).rejects.toThrow(/Forbidden/);
    });
  });
});
