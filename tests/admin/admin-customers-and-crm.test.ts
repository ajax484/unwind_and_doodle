import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  listAdminCustomers,
  getAdminCustomerDetail,
  updateAdminCustomerProfile,
  updateAdminCustomerConsent,
  createCustomerNote,
  deleteCustomerNote,
  exportAdminCustomersCsv,
} from '@/services/admin-customer.service';

describe('Phase 6E: Admin Customer Management & CRM', () => {
  const orgA = 'org-unwind-doodle-01';
  const orgB = 'org-competitor-02';

  const adminUserA = 'usr-admin-ada';
  const adminUserB = 'usr-admin-other';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle' },
        { id: orgB, name: 'Competitor Store' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminUserA, role: 'owner' },
        { id: 'mem-2', organization_id: orgB, user_id: adminUserB, role: 'admin' },
      ],
      customers: [
        {
          id: 'cust-chidi',
          organization_id: orgA,
          user_id: 'usr-chidi-01', // Registered account
          email: 'chidi.okeke@example.com',
          first_name: 'Chidi',
          last_name: 'Okeke',
          phone: '08012345678',
          whatsapp_number: '2348012345678',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          email_verified_at: '2026-08-01T12:00:00Z',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
        {
          id: 'cust-ngozi',
          organization_id: orgA,
          user_id: null, // Guest shopper
          email: 'ngozi.guest@example.com',
          first_name: 'Ngozi',
          last_name: 'Eze',
          phone: '08098765432',
          whatsapp_number: null,
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          email_verified_at: null,
          created_at: '2026-08-05T10:00:00Z',
          updated_at: '2026-08-05T10:00:00Z',
        },
        {
          id: 'cust-amaka',
          organization_id: orgA,
          user_id: 'usr-amaka-02', // Registered account
          email: 'amaka.new@example.com',
          first_name: 'Amaka',
          last_name: 'Bello',
          phone: '07011223344',
          whatsapp_number: '2347011223344',
          email_marketing_consent: false,
          whatsapp_marketing_consent: false,
          email_verified_at: '2026-08-10T12:00:00Z',
          created_at: '2026-08-10T10:00:00Z',
          updated_at: '2026-08-10T10:00:00Z',
        },
        // Org B Customer
        {
          id: 'cust-org-b',
          organization_id: orgB,
          user_id: 'usr-b-customer',
          email: 'competitor.cust@example.com',
          first_name: 'David',
          last_name: 'Smith',
          phone: '09012345678',
          whatsapp_number: null,
          email_marketing_consent: true,
          whatsapp_marketing_consent: false,
          email_verified_at: '2026-08-01T10:00:00Z',
          created_at: '2026-08-01T10:00:00Z',
          updated_at: '2026-08-01T10:00:00Z',
        },
      ],
      customer_addresses: [
        {
          id: 'addr-chidi-1',
          customer_id: 'cust-chidi',
          recipient_name: 'Chidi Okeke',
          phone: '08012345678',
          address_line_1: '12 Admiralty Way, Lekki',
          address_line_2: 'Flat 4B',
          state: 'Lagos',
          lga: 'Eti-Osa',
          is_default: true,
          created_at: '2026-08-01T11:00:00Z',
        },
      ],
      orders: [
        // Chidi completed order 1
        {
          id: 'ord-chidi-1',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          order_number: 'ORD-2026-001',
          status: 'confirmed',
          payment_status: 'successful',
          total_amount: 25000,
          created_at: '2026-08-02T10:00:00Z',
        },
        // Chidi completed order 2
        {
          id: 'ord-chidi-2',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          order_number: 'ORD-2026-002',
          status: 'received',
          payment_status: 'successful',
          total_amount: 15000,
          created_at: '2026-08-08T10:00:00Z',
        },
        // Ngozi completed guest order
        {
          id: 'ord-ngozi-1',
          organization_id: orgA,
          customer_id: 'cust-ngozi',
          order_number: 'ORD-2026-003',
          status: 'shipped',
          payment_status: 'successful',
          total_amount: 12000,
          created_at: '2026-08-06T10:00:00Z',
        },
        // Cancelled / unpaid order for Chidi (must not count towards LTV)
        {
          id: 'ord-chidi-cancelled',
          organization_id: orgA,
          customer_id: 'cust-chidi',
          order_number: 'ORD-2026-004',
          status: 'cancelled',
          payment_status: 'unpaid',
          total_amount: 50000,
          created_at: '2026-08-09T10:00:00Z',
        },
      ],
      order_items: [
        { id: 'item-1', order_id: 'ord-chidi-1', product_id: 'p-1', quantity: 2 },
        { id: 'item-2', order_id: 'ord-chidi-2', product_id: 'p-2', quantity: 1 },
        { id: 'item-3', order_id: 'ord-ngozi-1', product_id: 'p-1', quantity: 1 },
      ],
      carts: [
        { id: 'cart-1', customer_id: 'cust-amaka', status: 'abandoned', created_at: '2026-08-11T10:00:00Z' },
      ],
      reviews: [
        { id: 'rev-1', customer_id: 'cust-chidi', product_id: 'p-1', rating: 5, title: 'Amazing quality!', created_at: '2026-08-03T10:00:00Z' },
      ],
      customer_notes: [],
      audit_logs: [],
      domain_events: [],
    });
  });

  describe('1. Customer List & Lifetime Value (LTV) Calculation', () => {
    it('lists organization customers, accurately aggregates LTV excluding unpaid/cancelled orders, and returns summary KPIs', async () => {
      const res = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
      });

      expect(res.customers.length).toBe(3);
      expect(res.summary.totalCustomers).toBe(3);
      expect(res.summary.registeredAccounts).toBe(2); // Chidi, Amaka
      expect(res.summary.guestCustomers).toBe(1); // Ngozi
      expect(res.summary.emailSubscribers).toBe(2); // Chidi, Ngozi
      expect(res.summary.whatsappSubscribers).toBe(1); // Chidi

      // Total LTV = Chidi (25k + 15k = 40k) + Ngozi (12k) = 52,000 NGN (excluding 50k cancelled)
      expect(res.summary.totalLifetimeValue).toBe(52000);

      const chidi = res.customers.find((c) => c.id === 'cust-chidi');
      expect(chidi?.hasAccount).toBe(true);
      expect(chidi?.totalOrdersCount).toBe(3);
      expect(chidi?.completedOrdersCount).toBe(2);
      expect(chidi?.lifetimeValue).toBe(40000);
      expect(chidi?.emailMarketingConsent).toBe(true);
      expect(chidi?.whatsappMarketingConsent).toBe(true);

      const ngozi = res.customers.find((c) => c.id === 'cust-ngozi');
      expect(ngozi?.hasAccount).toBe(false); // Guest
      expect(ngozi?.totalOrdersCount).toBe(1);
      expect(ngozi?.lifetimeValue).toBe(12000);
    });
  });

  describe('2. Search & Multi-Filters', () => {
    it('searches customers by name, email, and phone', async () => {
      const searchByName = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        search: 'Chidi',
      });
      expect(searchByName.customers.length).toBe(1);
      expect(searchByName.customers[0].id).toBe('cust-chidi');

      const searchByEmail = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        search: 'ngozi.guest@example.com',
      });
      expect(searchByEmail.customers.length).toBe(1);
      expect(searchByEmail.customers[0].id).toBe('cust-ngozi');

      const searchByPhone = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        search: '07011223344',
      });
      expect(searchByPhone.customers.length).toBe(1);
      expect(searchByPhone.customers[0].id).toBe('cust-amaka');
    });

    it('filters by account type (registered vs guest)', async () => {
      const registered = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        accountType: 'registered',
      });
      expect(registered.customers.length).toBe(2);

      const guests = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        accountType: 'guest',
      });
      expect(guests.customers.length).toBe(1);
      expect(guests.customers[0].id).toBe('cust-ngozi');
    });

    it('filters by marketing consent (email vs whatsapp)', async () => {
      const emailSubs = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        marketingConsent: 'email_subscribed',
      });
      expect(emailSubs.customers.length).toBe(2);

      const waSubs = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        marketingConsent: 'whatsapp_subscribed',
      });
      expect(waSubs.customers.length).toBe(1);
      expect(waSubs.customers[0].id).toBe('cust-chidi');
    });

    it('filters by order activity (has ordered vs never ordered)', async () => {
      const hasOrdered = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        orderActivity: 'has_ordered',
      });
      expect(hasOrdered.customers.length).toBe(2); // Chidi, Ngozi

      const neverOrdered = await listAdminCustomers(mockSupabase, {
        organizationId: orgA,
        orderActivity: 'never_ordered',
      });
      expect(neverOrdered.customers.length).toBe(1);
      expect(neverOrdered.customers[0].id).toBe('cust-amaka');
    });
  });

  describe('3. Customer Detail, CRM Profile & Activity Timeline', () => {
    it('retrieves comprehensive customer detail, addresses, orders, abandoned cart indicator, and activity events', async () => {
      const detail = await getAdminCustomerDetail(mockSupabase, 'cust-chidi', orgA);

      expect(detail.fullName).toBe('Chidi Okeke');
      expect(detail.hasAccount).toBe(true);
      expect(detail.emailVerified).toBe(true);
      expect(detail.metrics.totalOrders).toBe(3);
      expect(detail.metrics.completedOrders).toBe(2);
      expect(detail.metrics.lifetimeValue).toBe(40000);
      expect(detail.metrics.averageOrderValue).toBe(20000); // 40,000 / 2
      expect(detail.orders.length).toBe(3);
      expect(detail.addresses.length).toBe(1);
      expect(detail.addresses[0].recipientName).toBe('Chidi Okeke');
      expect(detail.addresses[0].isDefault).toBe(true);

      // Verify activity timeline contains account created, orders placed, and reviews
      expect(detail.activity.length).toBeGreaterThanOrEqual(4);
      expect(detail.activity.some((a) => a.type === 'account.created')).toBe(true);
      expect(detail.activity.some((a) => a.type === 'order.placed')).toBe(true);
      expect(detail.activity.some((a) => a.type === 'review.submitted')).toBe(true);
    });

    it('detects abandoned cart for inactive customer', async () => {
      const detail = await getAdminCustomerDetail(mockSupabase, 'cust-amaka', orgA);
      expect(detail.hasAbandonedCart).toBe(true);
      expect(detail.metrics.totalOrders).toBe(0);
      expect(detail.metrics.lifetimeValue).toBe(0);
    });
  });

  describe('4. Profile Updates & Marketing Consent Management', () => {
    it('updates customer contact info and records audit log', async () => {
      const updated = await updateAdminCustomerProfile(
        mockSupabase,
        'cust-chidi',
        {
          first_name: 'Chidi Junior',
          last_name: 'Okeke-Emeka',
          phone: '08099887766',
        },
        adminUserA,
        orgA
      );

      expect(updated.first_name).toBe('Chidi Junior');
      expect(updated.last_name).toBe('Okeke-Emeka');
      expect(updated.phone).toBe('08099887766');

      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'customer.updated');
      expect(audit).toBeDefined();
      expect(audit?.actor_id).toBe(adminUserA);
    });

    it('updates marketing consent explicitly with audit log and domain event', async () => {
      const res = await updateAdminCustomerConsent(
        mockSupabase,
        'cust-amaka',
        {
          channel: 'email',
          consent: true,
          reason: 'Customer requested newsletter opt-in via WhatsApp support',
        },
        adminUserA,
        orgA
      );

      expect(res.success).toBe(true);
      expect(res.channel).toBe('email');
      expect(res.consent).toBe(true);

      // Verify customer record
      const customer = mockSupabase._store.customers.find((c) => c.id === 'cust-amaka');
      expect(customer?.email_marketing_consent).toBe(true);

      // Verify audit log
      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'customer.consent_updated');
      expect(audit).toBeDefined();

      // Verify domain event
      const event = mockSupabase._store.domain_events.find((e) => e.event_type === 'customer.consent_changed');
      expect(event).toBeDefined();
    });
  });

  describe('5. Internal CRM Notes', () => {
    it('creates and deletes internal admin notes', async () => {
      const note = await createCustomerNote(
        mockSupabase,
        'cust-chidi',
        'VIP customer, requested priority delivery packaging.',
        adminUserA,
        orgA
      );

      expect(note.note).toBe('VIP customer, requested priority delivery packaging.');

      const detail = await getAdminCustomerDetail(mockSupabase, 'cust-chidi', orgA);
      expect(detail.notes.length).toBe(1);

      // Delete note
      const delRes = await deleteCustomerNote(
        mockSupabase,
        'cust-chidi',
        note.id,
        adminUserA,
        orgA
      );
      expect(delRes.success).toBe(true);

      const checkDetail = await getAdminCustomerDetail(mockSupabase, 'cust-chidi', orgA);
      expect(checkDetail.notes.length).toBe(0);
    });
  });

  describe('6. Secure Customer CSV Export', () => {
    it('exports sanitized customer CSV without secrets and records an audit log', async () => {
      const csv = await exportAdminCustomersCsv(
        mockSupabase,
        orgA,
        adminUserA,
        {}
      );

      expect(csv).toContain('First Name,Last Name,Email,Phone');
      expect(csv).toContain('Chidi');
      expect(csv).toContain('Ngozi');
      expect(csv).toContain('Amaka');

      // Verify Org B customer is NOT in export
      expect(csv).not.toContain('David');
      expect(csv).not.toContain('competitor.cust@example.com');

      // Verify no sensitive tokens/secrets
      expect(csv).not.toContain('password');
      expect(csv).not.toContain('token');

      // Verify audit log
      const audit = mockSupabase._store.audit_logs.find((a) => a.action === 'customer.exported');
      expect(audit).toBeDefined();
    });
  });

  describe('7. Multi-Tenant Security & Tenant Isolation', () => {
    it('denies accessing another organization customer details', async () => {
      await expect(
        getAdminCustomerDetail(mockSupabase, 'cust-org-b', orgA)
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies updating profile or consent for another organization customer', async () => {
      await expect(
        updateAdminCustomerProfile(
          mockSupabase,
          'cust-org-b',
          { first_name: 'Hacked' },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);

      await expect(
        updateAdminCustomerConsent(
          mockSupabase,
          'cust-org-b',
          { channel: 'email', consent: true },
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);
    });

    it('denies creating internal notes on another organization customer', async () => {
      await expect(
        createCustomerNote(
          mockSupabase,
          'cust-org-b',
          'Intrusion attempt note',
          adminUserA,
          orgA
        )
      ).rejects.toThrow(/Forbidden|not found/i);
    });
  });
});
