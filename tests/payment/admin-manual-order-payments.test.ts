import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAdminManualOrder,
  createManualPaymentAttemptForOrder,
  getPaymentRequestByToken,
} from '@/services/manual-order.service';
import { ORDER_STATUS, PAYMENT_STATUS } from '@/lib/constants';

describe('Admin Manual Orders: Offline Payment & Admin-Controlled Payment Method (Step 10)', () => {
  let mockSupabase: any;
  const orgId = '11111111-1111-4111-8111-111111111111';
  const otherOrgId = '22222222-2222-4222-8222-222222222222';
  const userId = '33333333-3333-4333-8333-333333333333';
  const adminEmail = 'admin@unwindanddoodle.com';
  const warehouseId = '44444444-4444-4444-8444-444444444444';
  const locationId = '55555555-5555-4555-8555-555555555555';
  const productId = '66666666-6666-4666-8666-666666666666';

  let inMemoryOrders: any[] = [];
  let inMemoryOrderItems: any[] = [];
  let inMemoryPayments: any[] = [];
  let inMemoryPaymentRequests: any[] = [];
  let inMemoryAuditLogs: any[] = [];
  let inMemoryEvents: any[] = [];
  let inMemoryInventory: any[] = [];
  let inMemoryReservations: any[] = [];
  let inMemoryPaymentMethods: any[] = [];
  let inMemoryCustomers: any[] = [];

  beforeEach(() => {
    inMemoryOrders = [];
    inMemoryOrderItems = [];
    inMemoryPayments = [];
    inMemoryPaymentRequests = [];
    inMemoryAuditLogs = [];
    inMemoryEvents = [];
    inMemoryCustomers = [];
    inMemoryInventory = [
      {
        warehouse_id: warehouseId,
        product_id: productId,
        quantity: 50,
        reserved_quantity: 0,
      },
    ];
    inMemoryReservations = [];
    inMemoryPaymentMethods = [
      {
        id: 'pm-1',
        organization_id: orgId,
        provider: 'paystack',
        enabled: true,
        display_title: 'Paystack',
        display_description: 'Pay with Card or Bank Transfer',
      },
      {
        id: 'pm-2',
        organization_id: orgId,
        provider: 'flutterwave',
        enabled: true,
        display_title: 'Flutterwave',
        display_description: 'Pay with Flutterwave',
      },
      {
        id: 'pm-3',
        organization_id: orgId,
        provider: 'manual',
        enabled: true,
        display_title: 'Direct Bank Transfer',
        display_description: 'Pay directly into our GTB bank account',
        bank_name: 'Guaranty Trust Bank',
        account_name: 'Unwind & Doodle Official Ltd',
        account_number: '0123456789',
        instructions: 'Include your Order Number in the transfer remark',
      },
    ];

    mockSupabase = {
      from: vi.fn((table: string) => {
        const queryState: any = {
          _table: table,
          _where: [] as Array<{ col: string; op: string; val: any }>,
          _select: '*',
          _orderBy: null,
          _limit: null,
        };

        const chain: any = {
          select: vi.fn((cols = '*') => {
            queryState._select = cols;
            return chain;
          }),
          eq: vi.fn((col: string, val: any) => {
            queryState._where.push({ col, op: 'eq', val });
            return chain;
          }),
          ilike: vi.fn((col: string, val: any) => {
            queryState._where.push({ col, op: 'ilike', val });
            return chain;
          }),
          like: vi.fn((col: string, val: any) => {
            queryState._where.push({ col, op: 'like', val });
            return chain;
          }),
          in: vi.fn((col: string, vals: any[]) => {
            queryState._where.push({ col, op: 'in', val: vals });
            return chain;
          }),
          order: vi.fn((col: string, opts?: any) => {
            queryState._orderBy = { col, ascending: opts?.ascending ?? true };
            return chain;
          }),
          limit: vi.fn((n: number) => {
            queryState._limit = n;
            return chain;
          }),
          insert: vi.fn((payload: any) => {
            const rows = Array.isArray(payload) ? payload : [payload];
            const inserted = rows.map((r, i) => ({
              id: r.id || `${table}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              created_at: r.created_at || new Date().toISOString(),
              updated_at: r.updated_at || new Date().toISOString(),
              ...r,
            }));

            if (table === 'orders') inMemoryOrders.push(...inserted);
            else if (table === 'order_items') inMemoryOrderItems.push(...inserted);
            else if (table === 'payments') inMemoryPayments.push(...inserted);
            else if (table === 'order_payment_requests') inMemoryPaymentRequests.push(...inserted);
            else if (table === 'audit_logs') inMemoryAuditLogs.push(...inserted);
            else if (table === 'domain_events') inMemoryEvents.push(...inserted);
            else if (table === 'inventory_reservations') inMemoryReservations.push(...inserted);
            else if (table === 'customers') inMemoryCustomers.push(...inserted);

            const result = {
              data: Array.isArray(payload) ? inserted : inserted[0],
              error: null,
              select: (_cols?: string) => ({
                single: async () => ({ data: inserted[0], error: null }),
                maybeSingle: async () => ({ data: inserted[0], error: null }),
                then: (resolve: any) => resolve({ data: Array.isArray(payload) ? inserted : inserted[0], error: null }),
              }),
              then: (resolve: any) => resolve({ data: Array.isArray(payload) ? inserted : inserted[0], error: null }),
            };
            return result;
          }),
          update: vi.fn((updates: any) => {
            const updateWhere: Array<{ col: string; val: any }> = [];

            const performUpdate = () => {
              let targetArray: any[] = [];
              if (table === 'orders') targetArray = inMemoryOrders;
              else if (table === 'payments') targetArray = inMemoryPayments;
              else if (table === 'order_payment_requests') targetArray = inMemoryPaymentRequests;
              else if (table === 'inventory') targetArray = inMemoryInventory;
              else if (table === 'customers') targetArray = inMemoryCustomers;

              const matched: any[] = [];
              for (const item of targetArray) {
                const matches = updateWhere.every((w) => item[w.col] === w.val);
                if (matches) {
                  Object.assign(item, updates, { updated_at: new Date().toISOString() });
                  matched.push(item);
                }
              }
              return matched;
            };

            const updateChain: any = {
              eq: vi.fn((col: string, val: any) => {
                updateWhere.push({ col, val });
                return updateChain;
              }),
              in: vi.fn((col: string, vals: any[]) => {
                return updateChain;
              }),
              select: vi.fn(() => ({
                single: async () => {
                  const matched = performUpdate();
                  return { data: matched[0] || null, error: matched[0] ? null : { message: 'Not found' } };
                },
                maybeSingle: async () => {
                  const matched = performUpdate();
                  return { data: matched[0] || null, error: null };
                },
                then: (resolve: any) => {
                  const matched = performUpdate();
                  resolve({ data: matched, error: null });
                },
              })),
              then: (resolve: any) => {
                const matched = performUpdate();
                resolve({ data: matched, error: null });
              },
            };
            return updateChain;
          }),
          delete: vi.fn(() => ({
            eq: vi.fn(async (col: string, val: any) => {
              if (table === 'inventory_reservations') {
                inMemoryReservations = inMemoryReservations.filter((r) => r[col] !== val);
              }
              return { data: null, error: null };
            }),
          })),
          single: async () => {
            const data = await getFilteredData(table, queryState);
            return { data: data[0] || null, error: data[0] ? null : { message: 'Not found' } };
          },
          maybeSingle: async () => {
            const data = await getFilteredData(table, queryState);
            return { data: data[0] || null, error: null };
          },
          then: (resolve: any) => {
            getFilteredData(table, queryState).then((data) => resolve({ data, error: null }));
          },
        };

        return chain;
      }),
      rpc: vi.fn(async (fnName: string, args: any) => {
        if (fnName === 'create_admin_manual_order') {
          const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const orderNumber = `UD-MAN-${Date.now().toString().slice(-6)}`;
          const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
          const total = 16500;

          const order = {
            id: orderId,
            organization_id: args.p_org_id,
            order_number: orderNumber,
            total,
            subtotal: 15000,
            shipping_fee: 1500,
            discount_total: 0,
            status: ORDER_STATUS.CREATED,
            email: args.p_customer.email,
            first_name: args.p_customer.first_name,
            last_name: args.p_customer.last_name,
            phone: args.p_customer.phone,
            warehouse_id: args.p_warehouse_id || warehouseId,
            location_id: args.p_location_id || locationId,
            shipping_address: args.p_shipping_address,
          };
          inMemoryOrders.push(order);

          const reqRecord = {
            id: `payreq-${Date.now()}`,
            order_id: orderId,
            organization_id: args.p_org_id,
            token,
            amount: total,
            status: 'pending',
            expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          };
          inMemoryPaymentRequests.push(reqRecord);

          // Simulate inventory reservation
          inMemoryReservations.push({
            id: `res-${Date.now()}`,
            order_id: orderId,
            warehouse_id: order.warehouse_id,
            product_id: productId,
            quantity: 1,
            status: 'reserved',
          });

          return {
            data: {
              order_id: orderId,
              order_number: orderNumber,
              payment_request_id: reqRecord.id,
              token,
              total,
              subtotal: 15000,
              discount_total: 0,
              shipping_fee: 1500,
            },
            error: null,
          };
        }
        return { data: null, error: null };
      }),
    };

    async function getFilteredData(table: string, qs: any) {
      let source: any[] = [];
      if (table === 'orders') source = inMemoryOrders;
      else if (table === 'order_items') source = inMemoryOrderItems;
      else if (table === 'payments') source = inMemoryPayments;
      else if (table === 'order_payment_requests') source = inMemoryPaymentRequests;
      else if (table === 'audit_logs') source = inMemoryAuditLogs;
      else if (table === 'organization_payment_methods') source = inMemoryPaymentMethods;
      else if (table === 'customers') source = inMemoryCustomers;
      else if (table === 'inventory') source = inMemoryInventory;
      else if (table === 'inventory_reservations') source = inMemoryReservations;
      else if (table === 'warehouses') {
        source = [{ id: warehouseId, name: 'Main Lagos Warehouse', is_active: true, active: true, location_id: locationId }];
      } else if (table === 'products') {
        source = [{ id: productId, name: 'Mindful Coloring Book', selling_price: 15000, is_active: true, status: 'published' }];
      } else if (table === 'organizations') {
        source = [{ id: orgId, name: 'Unwind and Doodle', slug: 'unwind-and-doodle' }];
      }

      let res = [...source];
      for (const w of qs._where) {
        if (w.op === 'eq') {
          res = res.filter((item) => item[w.col] === w.val);
        } else if (w.op === 'ilike') {
          res = res.filter((item) => typeof item[w.col] === 'string' && item[w.col].toLowerCase() === String(w.val).toLowerCase());
        } else if (w.op === 'like') {
          res = res.filter((item) => typeof item[w.col] === 'string' && item[w.col] === w.val);
        } else if (w.op === 'in') {
          res = res.filter((item) => w.val.includes(item[w.col]));
        }
      }
      return res;
    }
  });

  // =========================================================================
  // 1. Payment Method Selection Scenarios
  // =========================================================================
  describe('1. Admin Payment Method Selection', () => {
    it('creates manual order with Paystack payment when Paystack is selected', async () => {
      const res = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
          shippingAddress: { addressLine1: '12 Marina Road', city: 'Lagos', state: 'Lagos' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'paystack',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      expect(res.orderId).toBeDefined();
      expect(res.paymentMethod).toBe('paystack');
      expect(res.paymentStatus).toBe('pending');
      expect(res.alreadyPaid).toBe(false);

      const createdPayment = inMemoryPayments.find((p) => p.order_id === res.orderId);
      expect(createdPayment).toBeDefined();
      expect(createdPayment.provider).toBe('paystack');
      expect(createdPayment.status).toBe('pending');
    });

    it('creates manual order with Flutterwave payment when Flutterwave is selected', async () => {
      const res = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'flw.cust@example.com', firstName: 'Hedy', lastName: 'Lamarr' },
          shippingAddress: { addressLine1: '45 Awolowo Way', city: 'Ikeja', state: 'Lagos' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'flutterwave',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      expect(res.orderId).toBeDefined();
      expect(res.paymentMethod).toBe('flutterwave');
      expect(res.paymentStatus).toBe('pending');

      const createdPayment = inMemoryPayments.find((p) => p.order_id === res.orderId);
      expect(createdPayment).toBeDefined();
      expect(createdPayment.provider).toBe('flutterwave');
      expect(createdPayment.status).toBe('pending');
    });

    it('creates Direct Bank Transfer order with snapshotted bank details when manual is selected', async () => {
      const res = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'bank.cust@example.com', firstName: 'Grace', lastName: 'Hopper' },
          shippingAddress: { addressLine1: '8 Adeola Odeku', city: 'VI', state: 'Lagos' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'manual',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      expect(res.orderId).toBeDefined();
      expect(res.paymentMethod).toBe('manual');
      expect(res.paymentStatus).toBe('pending');

      const createdPayment = inMemoryPayments.find((p) => p.order_id === res.orderId);
      expect(createdPayment).toBeDefined();
      expect(createdPayment.provider).toBe('manual');
      expect(createdPayment.status).toBe('pending');

      // Verify bank details snapshot
      expect(createdPayment.metadata.bank_details).toBeDefined();
      expect(createdPayment.metadata.bank_details.bankName).toBe('Guaranty Trust Bank');
      expect(createdPayment.metadata.bank_details.accountNumber).toBe('0123456789');
      expect(createdPayment.metadata.bank_details.accountName).toBe('Unwind & Doodle Official Ltd');
    });

    it('rejects order creation when selected payment method is disabled for the organization', async () => {
      // Disable flutterwave for this organization
      const flwMethod = inMemoryPaymentMethods.find((m) => m.provider === 'flutterwave');
      flwMethod.enabled = false;

      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'disabled.cust@example.com', firstName: 'Test' },
            items: [{ productId, quantity: 1 }],
            paymentMethod: 'flutterwave',
          },
          userId,
          orgId,
          'http://localhost:3000',
          adminEmail
        )
      ).rejects.toThrow(/Payment method 'flutterwave' is not enabled for this organization/);
    });
  });

  // =========================================================================
  // 2. Offline "Payment Already Received" Flow
  // =========================================================================
  describe('2. Offline "Payment Already Received" Flow', () => {
    it('creates manual order, records manual payment, and confirms fulfillment immediately when alreadyPaid is true', async () => {
      const res = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'walkin.cust@example.com', firstName: 'Alan', lastName: 'Turing', phone: '+2348011223344' },
          shippingAddress: { addressLine1: 'In-store Walk-in pickup' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'manual',
          alreadyPaid: true,
          paymentNote: 'Paid ₦16,500 cash at Lagos showroom',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      expect(res.orderId).toBeDefined();
      expect(res.paymentMethod).toBe('manual');
      expect(res.alreadyPaid).toBe(true);
      expect(res.paymentStatus).toBe('successful');

      // Verify payment was marked successful
      const payment = inMemoryPayments.find((p) => p.order_id === res.orderId);
      expect(payment).toBeDefined();
      expect(payment.status).toBe('successful');
      expect(payment.provider).toBe('manual');

      // Verify order moved from created to pending (active fulfillment)
      const order = inMemoryOrders.find((o) => o.id === res.orderId);
      expect(order.status).toBe(ORDER_STATUS.PENDING);

      // Verify domain event emitted
      const paymentEvent = inMemoryEvents.find((e) => e.event_type === 'payment.completed');
      expect(paymentEvent).toBeDefined();
    });

    it('rejects alreadyPaid flag if paymentMethod is a gateway provider (e.g. Paystack)', async () => {
      await expect(
        createAdminManualOrder(
          mockSupabase,
          {
            customer: { email: 'invalid.already@example.com', firstName: 'Invalid' },
            items: [{ productId, quantity: 1 }],
            paymentMethod: 'paystack',
            alreadyPaid: true,
          },
          userId,
          orgId,
          'http://localhost:3000',
          adminEmail
        )
      ).rejects.toThrow(/'Payment already received' is only supported for Direct Bank Transfer \/ Manual payment/);
    });
  });

  // =========================================================================
  // 3. Historical Immutability & Converting Unpaid Orders
  // =========================================================================
  describe('3. Historical Immutability & New Payment Attempts', () => {
    it('creates a new manual payment attempt on an existing unpaid order without mutating previous Paystack attempt', async () => {
      // 1. Create order with Paystack
      const orderRes = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'switch.cust@example.com', firstName: 'Katherine', lastName: 'Johnson' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'paystack',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      const firstPayment = inMemoryPayments.find((p) => p.order_id === orderRes.orderId);
      expect(firstPayment.provider).toBe('paystack');

      // 2. Admin attaches a new manual payment attempt
      const attemptRes = await createManualPaymentAttemptForOrder(
        mockSupabase,
        orderRes.orderId,
        {
          userId,
          organizationId: orgId,
          role: 'admin',
          userEmail: adminEmail,
        },
        {
          note: 'Customer called to pay via direct bank wire instead',
          alreadyPaid: true,
        }
      );

      expect(attemptRes.confirmed).toBe(true);

      // Verify both payments exist: Attempt 1 is immutable Paystack, Attempt 2 is Manual
      const allPaymentsForOrder = inMemoryPayments.filter((p) => p.order_id === orderRes.orderId);
      expect(allPaymentsForOrder).toHaveLength(2);
      expect(allPaymentsForOrder[0].provider).toBe('paystack');
      expect(allPaymentsForOrder[1].provider).toBe('manual');
      expect(allPaymentsForOrder[1].status).toBe('successful');
    });

    it('rejects manual payment attempt creation across organizations', async () => {
      const orderRes = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'other.cust@example.com', firstName: 'Tenant' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'paystack',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      // Admin from otherOrgId attempts to create a payment attempt on orgId's order
      await expect(
        createManualPaymentAttemptForOrder(
          mockSupabase,
          orderRes.orderId,
          {
            userId: 'admin-other',
            organizationId: otherOrgId,
            role: 'admin',
          }
        )
      ).rejects.toThrow(/Forbidden: Order does not belong to your organization/);
    });
  });

  // =========================================================================
  // 4. Customer Payment Link Verification
  // =========================================================================
  describe('4. Customer Payment Link (/pay/[token]) Handling', () => {
    it('returns snapshotted bank details and pending manual status for customer payment link view', async () => {
      const orderRes = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'token.cust@example.com', firstName: 'Margaret', lastName: 'Hamilton' },
          shippingAddress: { addressLine1: '14 Broad Street', city: 'Lagos' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'manual',
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      const detail = await getPaymentRequestByToken(mockSupabase, orderRes.token);
      expect(detail.paymentMethod).toBe('manual');
      expect(detail.status).toBe('pending');
      expect(detail.bankDetails).toBeDefined();
      expect(detail.bankDetails?.bankName).toBe('Guaranty Trust Bank');
      expect(detail.bankDetails?.accountNumber).toBe('0123456789');
    });

    it('reflects paid status for customer payment link view when order is already confirmed', async () => {
      const orderRes = await createAdminManualOrder(
        mockSupabase,
        {
          customer: { email: 'token.paid@example.com', firstName: 'Dorothy', lastName: 'Vaughan' },
          shippingAddress: { addressLine1: '20 Lekki Expressway', city: 'Lagos' },
          items: [{ productId, quantity: 1 }],
          paymentMethod: 'manual',
          alreadyPaid: true,
        },
        userId,
        orgId,
        'http://localhost:3000',
        adminEmail
      );

      const detail = await getPaymentRequestByToken(mockSupabase, orderRes.token);
      expect(detail.status).toBe('paid');
      expect(detail.paymentStatus).toBe('successful');
    });
  });
});
