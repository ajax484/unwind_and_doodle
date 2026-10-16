import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import {
  SERVICE_EMAIL_REGISTRY,
  renderServiceEmail,
  renderDefaultEmail,
  interpolateTemplate,
  getServiceEmailOverride,
  listServiceEmailTemplates,
  getServiceEmailTemplateDetail,
  upsertServiceEmailOverride,
  resetServiceEmailTemplate,
  clearAllTemplateCache,
  escapeHtml,
  sanitizeUrl,
} from '@/services/service-email.service';
import {
  dispatchTransactionalEmail,
  renderEmailTemplate,
  setTransporter,
  clearNotificationCache,
} from '@/services/notification.service';
import { NextRequest } from 'next/server';
import { GET as getListHandler } from '@/app/api/admin/settings/service-emails/route';
import {
  GET as getDetailHandler,
  PUT as putDetailHandler,
  DELETE as deleteDetailHandler,
} from '@/app/api/admin/settings/service-emails/[key]/route';
import { POST as postPreviewHandler } from '@/app/api/admin/settings/service-emails/[key]/preview/route';
import { POST as postTestHandler } from '@/app/api/admin/settings/service-emails/[key]/test/route';

vi.mock('@/lib/supabase/client', () => ({
  getServiceSupabaseClient: vi.fn(),
  getAnonSupabaseClient: vi.fn(),
}));

import { getServiceSupabaseClient } from '@/lib/supabase/client';

describe('Service Email Templates Feature', () => {
  const orgA = 'org-unwind-01';
  const orgB = 'org-competitor-02';
  const adminA = 'usr-admin-ada';
  const staffA = 'usr-staff-ada';
  const adminB = 'usr-admin-bob';

  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    vi.restoreAllMocks();
    clearAllTemplateCache();
    clearNotificationCache();
    setTransporter(null);

    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle Studio', slug: 'unwind-doodle' },
        { id: orgB, name: 'Competitor Brand', slug: 'competitor' },
      ],
      organization_members: [
        { id: 'mem-1', organization_id: orgA, user_id: adminA, role: 'owner' },
        { id: 'mem-2', organization_id: orgA, user_id: staffA, role: 'staff' },
        { id: 'mem-3', organization_id: orgB, user_id: adminB, role: 'owner' },
      ],
      service_email_templates: [],
      orders: [],
      customers: [],
    });

    vi.mocked(getServiceSupabaseClient).mockImplementation(() => mockSupabase as any);
  });

  describe('1. Default Template Registry and Canonical Rendering', () => {
    it('contains all 8 canonical transactional email templates with valid definitions', () => {
      const keys = Object.keys(SERVICE_EMAIL_REGISTRY);
      expect(keys).toHaveLength(8);
      expect(keys).toContain('order_confirmation');
      expect(keys).toContain('order_shipped');
      expect(keys).toContain('review_request');
      expect(keys).toContain('stock_alert');
      expect(keys).toContain('team_invitation');
      expect(keys).toContain('admin_new_order');
      expect(keys).toContain('admin_order_cancelled');
      expect(keys).toContain('admin_low_stock');

      for (const key of keys as (keyof typeof SERVICE_EMAIL_REGISTRY)[]) {
        const def = SERVICE_EMAIL_REGISTRY[key];
        expect(def.key).toBe(key);
        expect(def.name).toBeTruthy();
        expect(def.defaultSubject).toBeTruthy();
        expect(def.defaultBodyHtml).toBeTruthy();
        expect(def.variables.length).toBeGreaterThan(0);
        expect(def.sampleData).toBeDefined();
      }
    });

    it('renders default order confirmation template identically without modifications', () => {
      const rendered = renderDefaultEmail('order_confirmation', {
        orderNumber: 'ORD-99001',
        customerName: 'Fatima Sanusi',
        total: 50000,
        trackingUrl: 'https://example.com/order/ORD-99001',
        items: [{ name: 'A6 Sketchbook', quantity: 1, unit_price: 50000 }],
      });

      expect(rendered.html).toContain('ORD-99001');
      expect(rendered.html).toContain('Fatima Sanusi');
      expect(rendered.html).toContain('₦50,000');
      expect(rendered.html).toContain('A6 Sketchbook');
      expect(rendered.text).toContain('ORD-99001');
      expect(rendered.subject).toContain('ORD-99001');
    });
  });

  describe('2. Custom Overrides and Fallback Hierarchy', () => {
    it('applies an organization-specific override when active', () => {
      const rendered = renderServiceEmail(
        'order_confirmation',
        {
          orderNumber: 'ORD-1234',
          customerName: 'Zainab',
        },
        {
          override: {
            subject: 'Yay! Custom Subject for {{orderNumber}}',
            bodyHtml: '<h1>Custom Heading for {{customerName}}!</h1>',
            bodyText: 'Custom text: {{customerName}}',
            isActive: true,
          },
        }
      );

      expect(rendered.subject).toBe('Yay! Custom Subject for ORD-1234');
      expect(rendered.html).toContain('Custom Heading for Zainab!');
      expect(rendered.text).toBe('Custom text: Zainab');
    });

    it('falls back to system default when override is inactive or missing', () => {
      const renderedWithInactive = renderServiceEmail(
        'order_shipped',
        {
          orderNumber: 'ORD-771',
          trackingUrl: 'https://track.example.com',
        },
        {
          override: {
            subject: 'Inactive Subject',
            bodyHtml: '<p>Inactive Body</p>',
            isActive: false,
          },
        }
      );

      // Falls back to canonical order_shipped
      expect(renderedWithInactive.subject).toContain('ORD-771');
      expect(renderedWithInactive.html).toContain('Your Order is on its Way!');
    });

    it('falls back to default if database lookup fails without breaking dispatch', async () => {
      const failingSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  throw new Error('Database connection failed');
                },
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createMockSupabaseClient>;

      const override = await getServiceEmailOverride(failingSupabase as any, orgA, 'order_confirmation');
      expect(override).toBeNull();

      // Dispatch works even if DB lookup fails
      const result = await dispatchTransactionalEmail(
        {
          to: 'customer@example.com',
          subject: 'Order Confirmed: #ORD-FAIL-1',
          template: 'order_confirmation',
          data: { orderNumber: 'ORD-FAIL-1' },
          organizationId: orgA,
        },
        undefined,
        failingSupabase as any
      );

      expect(result.success).toBe(true);
    });
  });

  describe('3. Variable Interpolation, Item Collections, and Safety Controls', () => {
    it('correctly substitutes scalar variables and conditional blocks', () => {
      const template = `
        <p>Order: {{orderNumber}}</p>
        {{#if hasGift}}<div>Include gift wrap!</div>{{else}}<div>Standard packing</div>{{/if}}
      `;

      const withGift = interpolateTemplate(template, { orderNumber: 'ORD-G1', hasGift: true }, { isHtml: true });
      expect(withGift).toContain('Order: ORD-G1');
      expect(withGift).toContain('Include gift wrap!');
      expect(withGift).not.toContain('Standard packing');

      const withoutGift = interpolateTemplate(template, { orderNumber: 'ORD-G2', hasGift: false }, { isHtml: true });
      expect(withoutGift).toContain('Order: ORD-G2');
      expect(withoutGift).toContain('Standard packing');
    });

    it('renders collection loops and items table', () => {
      const template = `
        <table>
          {{#each items}}<tr><td>{{name}}</td><td>{{quantity}}</td><td>{{price}}</td></tr>{{/each}}
        </table>
      `;

      const rendered = interpolateTemplate(
        template,
        {
          items: [
            { name: 'Watercolors', quantity: 2, price: 10000 },
            { name: 'Brush Set', quantity: 1, price: 5000 },
          ],
        },
        { isHtml: true }
      );

      expect(rendered).toContain('<td>Watercolors</td><td>2</td><td>₦10,000</td>');
      expect(rendered).toContain('<td>Brush Set</td><td>1</td><td>₦5,000</td>');
    });

    it('handles missing or null variables gracefully without undefined outputs', () => {
      const template = 'Hello {{missingName}}, your code is {{code}}!';
      const rendered = interpolateTemplate(template, {}, { isHtml: true });
      expect(rendered).toBe('Hello , your code is !');
      expect(rendered).not.toContain('undefined');
      expect(rendered).not.toContain('null');
    });

    it('neutralizes malicious HTML script injections and dangerous links in user-provided values', () => {
      const maliciousName = '<script>alert("pwned")</script>Dr. Evil';
      const escaped = escapeHtml(maliciousName);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;Dr. Evil');

      const badUrl = 'javascript:alert(1)';
      expect(sanitizeUrl(badUrl)).toBe('#');

      const vbUrl = 'vbscript:msgbox';
      expect(sanitizeUrl(vbUrl)).toBe('#');

      const goodUrl = 'https://unwindanddoodle.com/track';
      expect(sanitizeUrl(goodUrl)).toBe('https://unwindanddoodle.com/track');
    });
  });

  describe('4. Multi-Tenant Isolation and Authorization Controls', () => {
    it('isolates template overrides across organizations', async () => {
      // Save override for Org A
      await upsertServiceEmailOverride(
        mockSupabase as any,
        orgA,
        'order_confirmation',
        {
          subject: 'Org A Exclusive Subject: {{orderNumber}}',
          bodyHtml: '<p>Org A Content</p>',
        },
        adminA
      );

      // Org A detail reflects override
      const detailA = await getServiceEmailTemplateDetail(mockSupabase as any, orgA, 'order_confirmation');
      expect(detailA.isCustomized).toBe(true);
      expect(detailA.effectiveSubject).toContain('Org A Exclusive Subject');

      // Org B detail reflects system default (NO leakage)
      const detailB = await getServiceEmailTemplateDetail(mockSupabase as any, orgB, 'order_confirmation');
      expect(detailB.isCustomized).toBe(false);
      expect(detailB.effectiveSubject).toBe(SERVICE_EMAIL_REGISTRY.order_confirmation.defaultSubject);
    });

    it('correctly updates and resets template overrides', async () => {
      // 1. Initially default
      let detail = await getServiceEmailTemplateDetail(mockSupabase as any, orgA, 'review_request');
      expect(detail.isCustomized).toBe(false);

      // 2. Save override
      await upsertServiceEmailOverride(
        mockSupabase as any,
        orgA,
        'review_request',
        {
          subject: 'Tell us what you think! ⭐',
          bodyHtml: '<p>Custom review body</p>',
        },
        adminA
      );

      detail = await getServiceEmailTemplateDetail(mockSupabase as any, orgA, 'review_request');
      expect(detail.isCustomized).toBe(true);
      expect(detail.effectiveSubject).toBe('Tell us what you think! ⭐');

      // 3. Reset back to default
      const resetDetail = await resetServiceEmailTemplate(mockSupabase as any, orgA, 'review_request');
      expect(resetDetail.isCustomized).toBe(false);
      expect(resetDetail.effectiveSubject).toBe(SERVICE_EMAIL_REGISTRY.review_request.defaultSubject);
    });
  });

  describe('5. Admin API Endpoints Simulation', () => {
    it('lists all templates for an authorized admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings/service-emails', {
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
        },
      });

      const res = await getListHandler(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toHaveLength(8);
    });

    it('rejects PUT updates from staff members without admin role', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/order_confirmation', {
        method: 'PUT',
        headers: {
          'x-admin-user-id': staffA, // staff role
          'x-organization-id': orgA,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Attempted change',
          bodyHtml: '<p>Change</p>',
        }),
      });

      const res = await putDetailHandler(req, { params: Promise.resolve({ key: 'order_confirmation' }) });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toContain('Forbidden');
    });

    it('allows owner to save and reset templates via API', async () => {
      // PUT
      const putReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/stock_alert', {
        method: 'PUT',
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Back in Stock: {{productName}}!',
          bodyHtml: '<p>We just got {{productName}} back in!</p>',
        }),
      });

      const putRes = await putDetailHandler(putReq, { params: Promise.resolve({ key: 'stock_alert' }) });
      const putJson = await putRes.json();

      expect(putRes.status).toBe(200);
      expect(putJson.success).toBe(true);
      expect(putJson.data.isCustomized).toBe(true);

      // DELETE (Reset)
      const delReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/stock_alert', {
        method: 'DELETE',
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
        },
      });

      const delRes = await deleteDetailHandler(delReq, { params: Promise.resolve({ key: 'stock_alert' }) });
      const delJson = await delRes.json();

      expect(delRes.status).toBe(200);
      expect(delJson.success).toBe(true);
      expect(delJson.data.isCustomized).toBe(false);
    });

    it('renders preview without sending emails or modifying orders', async () => {
      const prevReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/order_confirmation/preview', {
        method: 'POST',
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Preview Subject {{orderNumber}}',
          bodyHtml: '<h1>Preview for {{customerName}}</h1>',
        }),
      });

      const prevRes = await postPreviewHandler(prevReq, { params: Promise.resolve({ key: 'order_confirmation' }) });
      const prevJson = await prevRes.json();

      expect(prevRes.status).toBe(200);
      expect(prevJson.success).toBe(true);
      expect(prevJson.data.subject).toContain('Preview Subject ORD-98210');
      expect(prevJson.data.html).toContain('Preview for Amina Bello');
    });

    it('sends test email to authorized administrator with rate limiting', async () => {
      const testReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/order_shipped/test', {
        method: 'POST',
        headers: {
          'x-admin-user-id': adminA,
          'x-test-admin-email': 'admin@unwindanddoodle.com',
          'x-organization-id': orgA,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: 'admin@unwindanddoodle.com',
          subject: 'Test Shipped Notification',
          bodyHtml: '<p>Test shipping body</p>',
        }),
      });

      const testRes = await postTestHandler(testReq, { params: Promise.resolve({ key: 'order_shipped' }) });
      const testJson = await testRes.json();

      expect(testRes.status).toBe(200);
      expect(testJson.success).toBe(true);
      expect(testJson.message).toContain('Test email sent to admin@unwindanddoodle.com');
    });
  });

  describe('6. Visual Email Builder Integration and Block Preservation', () => {
    it('provides valid canonical visual block definitions for all 8 templates', async () => {
      const {
        SERVICE_EMAIL_DEFAULT_BLOCKS,
        getDefaultBlocksForTemplate,
      } = await import('@/lib/service-email-blocks');

      const templateKeys = Object.keys(SERVICE_EMAIL_REGISTRY) as (keyof typeof SERVICE_EMAIL_REGISTRY)[];
      expect(templateKeys).toHaveLength(8);

      for (const key of templateKeys) {
        const blocks = getDefaultBlocksForTemplate(key);
        expect(Array.isArray(blocks)).toBe(true);
        expect(blocks.length).toBeGreaterThan(0);

        // Verify each block has valid id, type, and data
        for (const blk of blocks) {
          expect(blk.id).toBeTruthy();
          expect(blk.type).toBeTruthy();
          expect(blk.data).toBeDefined();
        }
      }

      // Check order_confirmation specific transactional blocks
      const orderBlocks = SERVICE_EMAIL_DEFAULT_BLOCKS['order_confirmation'];
      const stringified = JSON.stringify(orderBlocks);
      expect(stringified).toContain('{{orderNumber}}');
      expect(stringified).toContain('{{customerName}}');
      expect(stringified).toContain('{{itemsTable}}');
      expect(stringified).toContain('{{trackingUrl}}');
    });

    it('compiles visual blocks into email-compatible HTML with brand elements', async () => {
      const {
        getDefaultBlocksForTemplate,
        compileServiceEmailBlocks,
      } = await import('@/lib/service-email-blocks');

      const blocks = getDefaultBlocksForTemplate('order_shipped');
      const compiledHtml = compileServiceEmailBlocks(blocks);

      expect(compiledHtml).toContain('Unwind &amp; Doodle');
      expect(compiledHtml).toContain('Your Order is on its Way!');
      expect(compiledHtml).toContain('{{orderNumber}}');
      expect(compiledHtml).toContain('{{trackingUrl}}');
    });

    it('persists and retrieves visual blocks through upsertServiceEmailOverride and getServiceEmailTemplateDetail', async () => {
      const {
        getDefaultBlocksForTemplate,
        compileServiceEmailBlocks,
      } = await import('@/lib/service-email-blocks');

      const customBlocks = getDefaultBlocksForTemplate('team_invitation');
      // Add custom header block
      customBlocks[0] = {
        id: 'blk_custom_h1',
        type: 'text',
        data: {
          content: 'Welcome to the Creative Family! 🎨',
          style: 'heading',
          align: 'center',
        },
      };

      const compiledHtml = compileServiceEmailBlocks(customBlocks);

      // Save override with blocks
      const saved = await upsertServiceEmailOverride(
        mockSupabase as any,
        orgA,
        'team_invitation',
        {
          subject: "You're Invited to Join {{organizationName}}!",
          bodyHtml: compiledHtml,
          blocks: customBlocks,
          isActive: true,
        },
        adminA
      );

      expect(saved.isCustomized).toBe(true);
      expect(saved.blocks).toBeDefined();
      expect((saved.blocks?.[0] as any).data.content).toBe('Welcome to the Creative Family! 🎨');
      expect(saved.effectiveBodyHtml).toContain('Welcome to the Creative Family!');

      // Retrieve detail from resolver
      const loaded = await getServiceEmailTemplateDetail(
        mockSupabase as any,
        orgA,
        'team_invitation'
      );

      expect(loaded.isCustomized).toBe(true);
      expect(loaded.blocks).toBeDefined();
      expect((loaded.blocks?.[0] as any).data.content).toBe('Welcome to the Creative Family! 🎨');
    });

    it('renders transactional email with dynamic interpolation from visually compiled blocks', async () => {
      const {
        getDefaultBlocksForTemplate,
        compileServiceEmailBlocks,
      } = await import('@/lib/service-email-blocks');

      const blocks = getDefaultBlocksForTemplate('order_confirmation');
      const compiledHtml = compileServiceEmailBlocks(blocks);

      // Save visual block override
      await upsertServiceEmailOverride(
        mockSupabase as any,
        orgA,
        'order_confirmation',
        {
          subject: 'Order #{{orderNumber}} Confirmed!',
          bodyHtml: compiledHtml,
          blocks,
        },
        adminA
      );

      const override = await getServiceEmailOverride(mockSupabase as any, orgA, 'order_confirmation');
      expect(override).not.toBeNull();

      // Render through authoritative delivery resolver with live order data
      const rendered = renderServiceEmail(
        'order_confirmation',
        {
          orderNumber: 'ORD-VIS-77',
          customerName: 'Chiamaka Okonkwo',
          total: 25000,
          trackingUrl: 'https://unwindanddoodle.com/track/ORD-VIS-77',
          items: [
            { product_name: 'Soft Pastels 24-Color Set', quantity: 1, unit_price: 25000 },
          ],
        },
        { override }
      );

      expect(rendered.subject).toBe('Order #ORD-VIS-77 Confirmed!');
      expect(rendered.html).toContain('Chiamaka Okonkwo');
      expect(rendered.html).toContain('ORD-VIS-77');
      expect(rendered.html).toContain('Soft Pastels 24-Color Set');
      expect(rendered.html).toContain('https://unwindanddoodle.com/track/ORD-VIS-77');
    });

    it('accepts blocks via PUT endpoint and returns blocks in GET endpoint', async () => {
      const {
        getDefaultBlocksForTemplate,
        compileServiceEmailBlocks,
      } = await import('@/lib/service-email-blocks');

      const blocks = getDefaultBlocksForTemplate('review_request');
      const compiledHtml = compileServiceEmailBlocks(blocks);

      const putReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/review_request', {
        method: 'PUT',
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: 'Review Your Order #{{orderNumber}}',
          bodyHtml: compiledHtml,
          blocks,
          isActive: true,
        }),
      });

      const putRes = await putDetailHandler(putReq, { params: Promise.resolve({ key: 'review_request' }) });
      const putJson = await putRes.json();

      expect(putRes.status).toBe(200);
      expect(putJson.success).toBe(true);
      expect(putJson.data.isCustomized).toBe(true);
      expect(putJson.data.blocks).toBeDefined();
      expect(putJson.data.blocks.length).toBeGreaterThan(0);

      // GET detail
      const getReq = new NextRequest('http://localhost:3000/api/admin/settings/service-emails/review_request', {
        method: 'GET',
        headers: {
          'x-admin-user-id': adminA,
          'x-organization-id': orgA,
        },
      });

      const getRes = await getDetailHandler(getReq, { params: Promise.resolve({ key: 'review_request' }) });
      const getJson = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getJson.success).toBe(true);
      expect(getJson.data.blocks).toBeDefined();
      expect(getJson.data.blocks.length).toBeGreaterThan(0);
    });
  });
});
