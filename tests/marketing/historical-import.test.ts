import { describe, it, expect, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@tests/mocks/supabase.mock';
import { parseCsvRows, parseCsvObjects } from '@/lib/csv-parser';
import {
  parseAndValidateBumpaData,
  executeHistoricalImport,
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  normalizeProductTitle,
  mapBumpaOrderStatus,
  mapBumpaPaymentStatus,
  parseBumpaConsent,
  resolveConsentPrecedence,
  getImportBatches,
} from '@/services/historical-import.service';
import { previewSegmentRules } from '@/services/marketing-segmentation.service';
import { resolveMarketingContext } from '@/services/marketing-context.service';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';

describe('Step 17D: Historical Customer & Order Import (Bumpa -> Unwind & Doodle)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  const orgA = 'org-11111111-1111-1111-1111-111111111111';
  const orgB = 'org-22222222-2222-2222-2222-222222222222';
  const adminA = 'usr-admin-alice-101';

  const prodBookA = 'prod-aaaa-1111-1111-1111-111111111111';
  const prodBookB = 'prod-bbbb-2222-2222-2222-222222222222';
  const prodKitC = 'prod-cccc-3333-3333-3333-333333333333';

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient({
      organizations: [
        { id: orgA, name: 'Unwind & Doodle Store' },
        { id: orgB, name: 'Other Store' },
      ],
      products: [
        {
          id: prodBookA,
          organization_id: orgA,
          name: 'Cozy Animals Coloring Book',
          status: 'published',
          selling_price: 7500,
        },
        {
          id: prodBookB,
          organization_id: orgA,
          name: 'Mindful Patterns Journal',
          status: 'published',
          selling_price: 9000,
        },
        {
          id: prodKitC,
          organization_id: orgA,
          name: 'Deluxe Doodle Kit',
          status: 'published',
          selling_price: 15000,
        },
      ],
      customers: [
        {
          id: 'cust-existing-1',
          organization_id: orgA,
          email: 'existing.optout@example.com',
          first_name: 'Existing',
          last_name: 'OptOutUser',
          phone: '08012345678',
          email_marketing_consent: false,
          whatsapp_marketing_consent: false,
          created_at: '2025-01-01T10:00:00Z',
        },
        {
          id: 'cust-existing-2',
          organization_id: orgA,
          email: 'existing.optin@example.com',
          first_name: 'Existing',
          last_name: 'OptInUser',
          phone: '08087654321',
          email_marketing_consent: true,
          whatsapp_marketing_consent: true,
          created_at: '2025-02-01T10:00:00Z',
        },
      ],
      orders: [],
      order_items: [],
      payments: [],
      import_batches: [],
      historical_product_mappings: [],
      domain_events: [],
      marketing_automation_executions: [],
      audit_logs: [],
    });
  });

  // ==========================================================================
  // 1. CSV PARSING UTILITY TESTS
  // ==========================================================================
  describe('Zero-dependency RFC 4180 CSV Parser', () => {
    it('parses simple comma-separated values', () => {
      const csv = 'Order ID,Customer Name,Total\n1001,Alice Smith,5000\n1002,Bob Jones,7500';
      const { headers, rows } = parseCsvObjects(csv);
      expect(headers).toEqual(['Order ID', 'Customer Name', 'Total']);
      expect(rows).toHaveLength(2);
      expect(rows[0]['Order ID']).toBe('1001');
      expect(rows[0]['Customer Name']).toBe('Alice Smith');
      expect(rows[0]['Total']).toBe('5000');
    });

    it('handles quoted values with embedded commas and escaped quotes', () => {
      const csv = 'Title,Description,Price\n"Animals, Birds & Nature","A ""mindful"" book",4500';
      const { rows } = parseCsvObjects(csv);
      expect(rows).toHaveLength(1);
      expect(rows[0]['Title']).toBe('Animals, Birds & Nature');
      expect(rows[0]['Description']).toBe('A "mindful" book');
      expect(rows[0]['Price']).toBe('4500');
    });

    it('handles CRLF line endings and strips UTF-8 BOM', () => {
      const csv = '\uFEFFOrder ID,Email\r\n2001,test@example.com\r\n2002,user@example.com\r\n';
      const { headers, rows } = parseCsvObjects(csv);
      expect(headers).toEqual(['Order ID', 'Email']);
      expect(rows).toHaveLength(2);
      expect(rows[0]['Email']).toBe('test@example.com');
    });
  });

  // ==========================================================================
  // 2. NORMALIZATION & PRECEDENCE LOGIC
  // ==========================================================================
  describe('Normalization & Precedence Rules', () => {
    it('normalizes customer emails to lowercased and trimmed', () => {
      expect(normalizeCustomerEmail('  BIlal@Example.COM ')).toBe('bilal@example.com');
      expect(normalizeCustomerEmail('not-an-email')).toBeNull();
      expect(normalizeCustomerEmail('')).toBeNull();
      expect(normalizeCustomerEmail(null)).toBeNull();
    });

    it('normalizes phone numbers to clean digits', () => {
      expect(normalizeCustomerPhone('+234 (801) 234-5678')).toBe('2348012345678');
      expect(normalizeCustomerPhone('080 1234 5678')).toBe('08012345678');
      expect(normalizeCustomerPhone('123')).toBeNull();
    });

    it('normalizes product titles for catalog matching', () => {
      expect(normalizeProductTitle('Cozy Animals: Coloring Book (Vol. 1)!')).toBe(
        'cozy animals coloring book vol 1'
      );
    });

    it('maps Bumpa order statuses into canonical order statuses', () => {
      expect(mapBumpaOrderStatus('Completed')).toBe(ORDER_STATUS.RECEIVED);
      expect(mapBumpaOrderStatus('Delivered')).toBe(ORDER_STATUS.RECEIVED);
      expect(mapBumpaOrderStatus('Shipped')).toBe(ORDER_STATUS.SHIPPED);
      expect(mapBumpaOrderStatus('Processing')).toBe(ORDER_STATUS.CONFIRMED);
      expect(mapBumpaOrderStatus('Pending')).toBe(ORDER_STATUS.PENDING);
      expect(mapBumpaOrderStatus('Cancelled')).toBe(ORDER_STATUS.CANCELLED);
      expect(mapBumpaOrderStatus('Refunded')).toBe(ORDER_STATUS.REFUNDED);
      expect(mapBumpaOrderStatus('unknown_status')).toBe(ORDER_STATUS.PENDING);
    });

    it('enforces consent precedence: existing customer strictly wins', () => {
      // Existing opted-out customer CANNOT be flipped to true by historical import
      expect(resolveConsentPrecedence({ email_marketing_consent: false }, 'opted_in')).toBe(false);
      // Existing opted-in customer stays true
      expect(resolveConsentPrecedence({ email_marketing_consent: true }, 'opted_out')).toBe(true);

      // New customer: explicit opt-in is respected
      expect(resolveConsentPrecedence(null, 'opted_in')).toBe(true);
      // New customer: explicit opt-out is respected
      expect(resolveConsentPrecedence(null, 'opted_out')).toBe(false);
      // New customer: unknown consent defaults safely to false
      expect(resolveConsentPrecedence(null, 'unknown')).toBe(false);
    });
  });

  // ==========================================================================
  // 3. PARSE & PREVIEW VALIDATION
  // ==========================================================================
  describe('Parse and Preview Stage', () => {
    it('produces accurate preview summary from sample Bumpa CSV', async () => {
      const csv = `Order ID,Customer Name,Customer Email,Customer Phone,Order Date,Order Status,Payment Status,Product Name,Quantity,Unit Price,Total,Shipping State,Shipping City,Marketing Consent
BMP-101,Tunde Bakare,tunde@example.com,08011112222,2025-03-15,completed,paid,Cozy Animals Coloring Book,1,7500,7500,Lagos,Ikeja,subscribed
BMP-102,Existing OptOut,existing.optout@example.com,08012345678,2025-03-16,completed,paid,Mindful Patterns Journal,1,9000,9000,Abuja,Maitama,subscribed
BMP-103,Ngozi Eze,ngozi@example.com,08033334444,2025-03-17,processing,paid,Unknown Vintage Book,2,3000,6000,Rivers,Port Harcourt,unsubscribed`;

      const report = await parseAndValidateBumpaData(csv, orgA, mockSupabase as any, 'sample-bumpa.csv');

      expect(report.fileName).toBe('sample-bumpa.csv');
      expect(report.totalRows).toBe(3);
      expect(report.customers.total).toBe(3);
      expect(report.customers.newCount).toBe(2); // Tunde and Ngozi
      expect(report.customers.existingCount).toBe(1); // existing.optout@example.com
      expect(report.orders.total).toBe(3);

      // Product mappings check
      expect(report.products.totalDistinct).toBe(3);
      expect(report.products.mappedCount).toBe(2); // Cozy Animals Coloring Book & Mindful Patterns Journal
      expect(report.products.unmappedCount).toBe(1); // Unknown Vintage Book

      // Consent breakdown
      expect(report.consent.optedInCount).toBe(2);
      expect(report.consent.optedOutCount).toBe(1);
      expect(report.canProceed).toBe(true);
    });

    it('flags row-level warnings for missing customer identity without aborting entire batch', async () => {
      const csv = `Order ID,Customer Name,Customer Email,Customer Phone,Order Date,Product Name,Quantity,Unit Price
BMP-201,Valid Customer,valid@example.com,08099998888,2025-04-01,Cozy Animals Coloring Book,1,7500
BMP-202,Ghost Customer,,,2025-04-02,Cozy Animals Coloring Book,1,7500`;

      const report = await parseAndValidateBumpaData(csv, orgA, mockSupabase as any, 'missing-cust.csv');

      expect(report.orders.total).toBe(1);
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings[0]).toContain('Missing both email and phone number');
      expect(report.canProceed).toBe(true);
    });
  });

  // ==========================================================================
  // 4. EXECUTE IMPORT & IDEMPOTENCY
  // ==========================================================================
  describe('Execution & Idempotency', () => {
    it('executes full historical import, preserves timestamps, and enforces idempotency on re-run', async () => {
      const csv = `Order ID,Customer Name,Customer Email,Customer Phone,Order Date,Order Status,Payment Status,Product Name,Quantity,Unit Price,Total,Shipping State,Shipping City,Marketing Consent
BUMPA-9001,Halima Sani,halima@example.com,08055556666,2025-02-10T14:30:00Z,completed,paid,Cozy Animals Coloring Book,1,7500,7500,Kano,Nassarawa,subscribed
BUMPA-9002,Halima Sani,halima@example.com,08055556666,2025-03-20T11:00:00Z,completed,paid,Mindful Patterns Journal,1,9000,9000,Kano,Nassarawa,subscribed
BUMPA-9003,Existing OptOut,existing.optout@example.com,08012345678,2025-04-05T09:00:00Z,delivered,paid,Vintage Unmapped Coloring Pages,1,4000,4000,Lagos,Lekki,subscribed`;

      const confirmedMappings = {
        'cozy animals coloring book': { targetProductId: prodBookA, status: 'mapped' as const },
        'mindful patterns journal': { targetProductId: prodBookB, status: 'mapped' as const },
        'vintage unmapped coloring pages': { targetProductId: null, status: 'unmapped' as const },
      };

      // 1. First Execution
      const result1 = await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'run1.csv',
          csvContent: csv,
          confirmedProductMappings: confirmedMappings,
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      expect(result1.status).toBe('completed');
      expect(result1.importedCustomersCount).toBe(1); // Halima (new)
      expect(result1.updatedCustomersCount).toBe(1); // existing.optout (existing)
      expect(result1.importedOrdersCount).toBe(3);
      expect(result1.skippedOrdersCount).toBe(0);

      // Verify Halima's customer record in DB
      const { data: halima } = await mockSupabase
        .from('customers')
        .select('*')
        .eq('email', 'halima@example.com')
        .single();

      expect(halima).toBeTruthy();
      expect(halima!.source_system).toBe('bumpa');
      expect(halima!.source_record_id).toBe('halima@example.com');
      expect(halima!.email_marketing_consent).toBe(true);
      expect(new Date(halima!.created_at).toISOString()).toBe('2025-02-10T14:30:00.000Z');

      // Verify Existing Opt-out User's consent was NOT flipped
      const { data: existingUser } = await mockSupabase
        .from('customers')
        .select('*')
        .eq('email', 'existing.optout@example.com')
        .single();

      expect(existingUser!.email_marketing_consent).toBe(false); // Remained false!

      // Verify Orders in DB
      const { data: orders } = await mockSupabase
        .from('orders')
        .select('*')
        .eq('organization_id', orgA)
        .order('created_at', { ascending: true });

      expect(orders).toHaveLength(3);
      expect(orders![0].source_system).toBe('bumpa');
      expect(orders![0].source_record_id).toBe('BUMPA-9001');
      expect(new Date(orders![0].created_at).toISOString()).toBe('2025-02-10T14:30:00.000Z');
      expect(orders![0].status).toBe(ORDER_STATUS.RECEIVED);

      // Verify Order Items
      const { data: items } = await mockSupabase
        .from('order_items')
        .select('*')
        .eq('order_id', orders![2].id); // Order 9003 has unmapped item

      expect(items).toHaveLength(1);
      expect(items![0].product_name).toBe('Vintage Unmapped Coloring Pages');
      expect(items![0].product_id).toBeNull();
      expect(items![0].mapping_status).toBe('unmapped');

      // 2. Second Execution (Exact same CSV re-run to verify idempotency)
      const result2 = await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'run2_duplicate.csv',
          csvContent: csv,
          confirmedProductMappings: confirmedMappings,
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      expect(result2.status).toBe('completed');
      expect(result2.importedCustomersCount).toBe(0); // No new customers
      expect(result2.importedOrdersCount).toBe(0); // 0 new orders inserted
      expect(result2.skippedOrdersCount).toBe(3); // All 3 orders skipped as duplicates!

      // Confirm total orders in DB did not increase
      const { data: ordersAfter } = await mockSupabase
        .from('orders')
        .select('id')
        .eq('organization_id', orgA);

      expect(ordersAfter).toHaveLength(3);
    });
  });

  // ==========================================================================
  // 5. MARKETING AUTOMATION & EVENT SUPPRESSION SAFETY
  // ==========================================================================
  describe('Marketing Automation Isolation Invariant', () => {
    it('strictly avoids publishing domain events or creating automation executions during import', async () => {
      const csv = `Order ID,Customer Name,Customer Email,Order Date,Order Status,Product Name,Quantity,Unit Price
BMP-SAFETY-1,Safety Customer,safety@example.com,2025-01-15,completed,Cozy Animals Coloring Book,1,7500`;

      const confirmedMappings = {
        'cozy animals coloring book': { targetProductId: prodBookA, status: 'mapped' as const },
      };

      await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'safety.csv',
          csvContent: csv,
          confirmedProductMappings: confirmedMappings,
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      // Invariant Check 1: Zero domain events published
      const { data: events } = await mockSupabase.from('domain_events').select('*');
      expect(events).toHaveLength(0);

      // Invariant Check 2: Zero automation executions created
      const { data: executions } = await (mockSupabase as any)
        .from('marketing_automation_executions')
        .select('*');
      expect(executions).toHaveLength(0);

      // Audit log was created
      const { data: auditLogs } = await (mockSupabase as any)
        .from('audit_logs')
        .select('*')
        .eq('action', 'historical_import.completed');
      expect(auditLogs).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 6. DOWNSTREAM INTEGRATION (17B AUDIENCES & 17A CONTEXT)
  // ==========================================================================
  describe('Downstream Marketing Integration', () => {
    it('allows Step 17B product-aware audiences to match imported customers', async () => {
      // Import an order for Bob buying Book A with marketing consent
      const csv = `Order ID,Customer Name,Customer Email,Order Date,Order Status,Product Name,Quantity,Unit Price,Shipping State,Marketing Consent
BMP-AUD-1,Bob Buyer,bob.buyer@example.com,2025-02-01,completed,Cozy Animals Coloring Book,1,7500,Lagos,subscribed`;

      await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'aud.csv',
          csvContent: csv,
          confirmedProductMappings: {
            'cozy animals coloring book': { targetProductId: prodBookA, status: 'mapped' as const },
          },
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      // Query audience: Customers who purchased Book A AND live in Lagos
      const segmentRules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'shipping_state' as const, operator: 'equals' as const, value: 'Lagos' },
        ],
      };

      const preview = await previewSegmentRules(mockSupabase as any, orgA, segmentRules);
      expect(preview.customers.some((c) => c.email === 'bob.buyer@example.com')).toBe(true);

      // Query audience: Customers who have NOT purchased Book B
      const notPurchasedRules = {
        match: 'all' as const,
        conditions: [
          { field: 'purchased_product' as const, operator: 'equals' as const, value: prodBookA },
          { field: 'not_purchased_product' as const, operator: 'equals' as const, value: prodBookB },
        ],
      };

      const previewNotPurchased = await previewSegmentRules(mockSupabase as any, orgA, notPurchasedRules);
      expect(previewNotPurchased.customers.some((c) => c.email === 'bob.buyer@example.com')).toBe(true);
    });

    it('allows Step 17A personalization to resolve {{last_product}} from imported orders', async () => {
      // Import an order for Carol
      const csv = `Order ID,Customer Name,Customer Email,Order Date,Order Status,Product Name,Quantity,Unit Price
BMP-CTX-1,Carol Doodle,carol@example.com,2025-01-20,completed,Cozy Animals Coloring Book,1,7500`;

      await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'ctx.csv',
          csvContent: csv,
          confirmedProductMappings: {
            'cozy animals coloring book': { targetProductId: prodBookA, status: 'mapped' as const },
          },
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      const { data: carol } = await mockSupabase
        .from('customers')
        .select('id')
        .eq('email', 'carol@example.com')
        .single();

      const context = await resolveMarketingContext(mockSupabase as any, {
        customerId: carol!.id,
        customerEmail: 'carol@example.com',
      });

      expect(context.lastProduct).toBe('Cozy Animals Coloring Book');
    });
  });

  // ==========================================================================
  // 7. MULTI-TENANT ISOLATION
  // ==========================================================================
  describe('Multi-Tenant Isolation', () => {
    it('isolates import batches and records between organizations', async () => {
      const csv = `Order ID,Customer Name,Customer Email,Order Date,Order Status,Product Name,Quantity,Unit Price
BMP-TENANT-1,Tenant User,tenant@example.com,2025-02-10,completed,Cozy Animals Coloring Book,1,7500`;

      await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'orgA.csv',
          csvContent: csv,
          confirmedProductMappings: {
            'cozy animals coloring book': { targetProductId: prodBookA, status: 'mapped' as const },
          },
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      // Organization B query for batches
      const orgBBatches = await getImportBatches(mockSupabase as any, orgB);
      expect(orgBBatches).toHaveLength(0);

      // Organization A query for batches
      const orgABatches = await getImportBatches(mockSupabase as any, orgA);
      expect(orgABatches).toHaveLength(1);
      expect(orgABatches[0].fileName).toBe('orgA.csv');
    });
  });

  // ==========================================================================
  // 8. BUMPA PRODUCTION EXPORT FORMAT (PIPE-DELIMITED PRODUCTS & ADDRESS STATE)
  // ==========================================================================
  describe('Bumpa Real-World Export Parsing', () => {
    it('correctly parses pipe-separated products, shipping statuses, and extracts states from addresses', async () => {
      const realBumpaCsv = `id,"Order Number",Products,"Customer Name","Customer Email","Customer Phone","Customer Address","Payment Status",Status,"Shipping Status",Channel,Origin,Total,"Sub Total",Discount,"Amount Paid","Amount Due","Order Date","Created At","Updated At","Shipping Price",Tax,"Coupon Code","Shipping Option","Product SKU","Product Barcode","Product Quantity"
5730820,00773,"Play And Color Kit (Save 1k On Game Book And Unwind Kit) | Pack Of 12 Color Pencils | Pack Of 12 Felt Pens | Ultimate Game Book | General Themed Coloring Book","Yewande Babskareem",babskareemyewande@yahoo.com,+2348061258585,,PAID,PROCESSING,UNFULFILLED,MOBILE,whatsapp,25000.00,21000.00,0.00,25000.00,0.00,"2026-09-21 18:55:30",2026-09-21,2026-09-21,4000.00,0.00,,"Within Lagos 1 (Non Customized Copies)"," |  |  |  | "," |  |  |  | ","1 | 1 | 1 | 1 | 1"
5727377,00771,"Standard Custom Copy (3 Personal Images And 3 Themes) - (Portraits/People-Floral)","Ezinne joy",joynwaokike97@gmail.com,+2347043777818,"146b Ligali Ayorinde street VI, Victoria island, Lagos, Nigeria",PAID,OPEN,UNFULFILLED,WEB,website,16000.00,12000.00,0.00,16000.00,0.00,"2026-09-21 00:00:00",2026-09-21,2026-09-21,4000.00,0.00,,"Lagos (Customized Copies)",,,1
5713770,00766,"General Themed Coloring Book","Peculiar Paulinus",Peculiarpaulinus56@gmail.com,08151260156,"Gwarinpa 1st avenue soar plaza First floor A204, Abuja, Nigeria",PAID,COMPLETED,SHIPPED,MOBILE,whatsapp,9500.00,7000.00,0.00,9500.00,0.00,"2026-09-19 13:56:51",2026-09-19,2026-09-19,2500.00,0.00,,"Abuja 6",,,1
5186197,00557,"Unwind Kit (Save 500 On General Themed Book And Tools)  | Pack Of 12 Felt Pens | Pack Of 12 Color Pencils | General Themed Coloring Book","Fehintoluwa Aluko",alukofe@gmail.com,+2348166205348,"6 Alhaji Lamidi street, Papa Ajao, Mushin, Lagos, Lagos, Nigeria",PAID,COMPLETED,DELIVERED,WEB,website,14500.00,10500.00,0.00,14500.00,0.00,"2026-07-25 00:00:00",2026-07-25,2026-07-26,4000.00,0.00,,"Within Lagos 1 (Non Customized Copies)"," |  |  | "," |  |  | ","1 | 1 | 1 | 1"
5536529,00727-1,"Full Custom Kit (30 Personal images, tools) | Pack Of 12 Color Pencils | Pack Of 12 Felt Pens","Azibator ",,+2348068323529,"Name Azibator  Interswitch Building 9,   Plot 1648C, Oko-Awo Close, Victoria Island Lagos, Lagos, Nigeria",PAID,PROCESSING,UNFULFILLED,MOBILE,whatsapp,79000.00,75000.00,0.00,79000.00,0.00,"2026-08-31 20:10:31",2026-08-31,2026-09-02,4000.00,0.00,,"Lagos (Customized Copies)"," |  | "," |  | ","3 | 1 | 1"`;

      // 1. Preview
      const preview = await parseAndValidateBumpaData(realBumpaCsv, orgA, mockSupabase as any, 'bumpa_export.csv');
      expect(preview.canProceed).toBe(true);
      expect(preview.orders.total).toBe(5);
      expect(preview.customers.total).toBe(5);

      // Verify that multi-product pipe-separated items are split into distinct products
      const productTitles = preview.products.items.map((p) => p.historicalTitle);
      expect(productTitles).toContain('Play And Color Kit (Save 1k On Game Book And Unwind Kit)');
      expect(productTitles).toContain('Pack Of 12 Color Pencils');
      expect(productTitles).toContain('Pack Of 12 Felt Pens');
      expect(productTitles).toContain('Ultimate Game Book');
      expect(productTitles).toContain('General Themed Coloring Book');
      expect(productTitles).toContain('Standard Custom Copy (3 Personal Images And 3 Themes) - (Portraits/People-Floral)');
      expect(productTitles).toContain('Full Custom Kit (30 Personal images, tools)');

      // 2. Execute
      const result = await executeHistoricalImport(
        mockSupabase as any,
        {
          fileName: 'bumpa_export.csv',
          csvContent: realBumpaCsv,
          confirmedProductMappings: {
            'pack of 12 color pencils': { targetProductId: prodBookA, status: 'mapped' },
            'general themed coloring book': { targetProductId: prodBookB, status: 'mapped' },
          },
        },
        { organizationId: orgA, adminUserId: adminA }
      );

      expect(result.status).toBe('completed');
      expect(result.importedOrdersCount).toBe(5);

      // 3. Verify Order 5730820 (00773) has 5 individual line items
      const { data: order773 } = await mockSupabase
        .from('orders')
        .select('*')
        .eq('source_record_id', '5730820')
        .single();

      expect(order773).toBeTruthy();
      expect(order773!.order_number).toBe('BUMPA-00773');
      expect(order773!.status).toBe(ORDER_STATUS.CONFIRMED); // Processing + Unfulfilled -> Confirmed
      expect((order773!.shipping_address as any).state).toBe('Lagos'); // Extracted from "Within Lagos 1"

      const { data: items773 } = await mockSupabase
        .from('order_items')
        .select('*')
        .eq('order_id', order773!.id);

      expect(items773).toHaveLength(5);
      expect(items773!.map((i) => i.product_name)).toEqual([
        'Play And Color Kit (Save 1k On Game Book And Unwind Kit)',
        'Pack Of 12 Color Pencils',
        'Pack Of 12 Felt Pens',
        'Ultimate Game Book',
        'General Themed Coloring Book',
      ]);

      // 4. Verify Order 5186197 has received status because shipping status is DELIVERED
      const { data: order557 } = await mockSupabase
        .from('orders')
        .select('*')
        .eq('source_record_id', '5186197')
        .single();

      expect(order557).toBeTruthy();
      expect(order557!.status).toBe(ORDER_STATUS.RECEIVED); // Shipping Status DELIVERED -> received

      // 5. Verify Order 5713770 has shipped status because shipping status is SHIPPED
      const { data: order766 } = await mockSupabase
        .from('orders')
        .select('*')
        .eq('source_record_id', '5713770')
        .single();

      expect(order766).toBeTruthy();
      expect(order766!.status).toBe(ORDER_STATUS.SHIPPED); // Shipping Status SHIPPED -> shipped
      expect((order766!.shipping_address as any).state).toBe('Abuja'); // Extracted from address

      // 6. Verify customer without email (Azibator) was imported by phone number
      const { data: azibator } = await mockSupabase
        .from('customers')
        .select('*')
        .eq('phone', '2348068323529')
        .single();

      expect(azibator).toBeTruthy();
      expect(azibator!.first_name).toBe('Azibator');
      expect(azibator!.source_record_id).toBe('2348068323529');
    });
  });
});

