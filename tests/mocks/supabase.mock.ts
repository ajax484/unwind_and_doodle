import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';

export function createMockSupabaseClient(initialData?: {
  organizations?: any[];
  organization_members?: any[];
  locations?: any[];
  warehouses?: any[];
  warehouse_locations?: any[];
  delivery_rates?: any[];
  categories?: any[];
  products?: any[];
  product_images?: any[];
  product_categories?: any[];
  product_addons?: any[];
  inventory?: any[];
  inventory_reservations?: any[];
  carts?: any[];
  cart_items?: any[];
  customers?: any[];
  customer_addresses?: any[];
  orders?: any[];
  order_items?: any[];
  order_item_addons?: any[];
  order_status_history?: any[];
  payments?: any[];
  discounts?: any[];
  discount_products?: any[];
  discount_categories?: any[];
  customizations?: any[];
  customization_assets?: any[];
  domain_events?: any[];
  audit_logs?: any[];
  reviews?: any[];
  review_images?: any[];
  stock_notifications?: any[];
  inventory_movements?: any[];
  stock_receipts?: any[];
  bundle_items?: any[];
  order_item_bundle_components?: any[];
  order_payment_requests?: any[];
  stock_receipt_items?: any[];
  customer_notes?: any[];
  [key: string]: any[] | undefined;
}) {
  const store = {
    organizations: [...(initialData?.organizations || [])],
    organization_members: [...(initialData?.organization_members || [])],
    locations: [...(initialData?.locations || [])],
    warehouses: [...(initialData?.warehouses || [])],
    warehouse_locations: [...(initialData?.warehouse_locations || [])],
    delivery_rates: [...(initialData?.delivery_rates || [])],
    categories: [...(initialData?.categories || [])],
    products: [...(initialData?.products || [])],
    product_images: [...(initialData?.product_images || [])],
    product_categories: [...(initialData?.product_categories || [])],
    product_addons: [...(initialData?.product_addons || [])],
    bundle_items: [...(initialData?.bundle_items || [])],
    order_item_bundle_components: [...(initialData?.order_item_bundle_components || [])],
    order_payment_requests: [...(initialData?.order_payment_requests || [])],
    inventory: [...(initialData?.inventory || [])],
    inventory_reservations: [...(initialData?.inventory_reservations || [])],
    inventory_movements: [...(initialData?.inventory_movements || [])],
    stock_receipts: [...(initialData?.stock_receipts || [])],
    stock_receipt_items: [...(initialData?.stock_receipt_items || [])],
    carts: [...(initialData?.carts || [])],
    cart_items: [...(initialData?.cart_items || [])],
    customers: [...(initialData?.customers || [])],
    customer_addresses: [...(initialData?.customer_addresses || [])],
    customer_notes: [...(initialData?.customer_notes || [])],
    orders: [...(initialData?.orders || [])],
    order_items: [...(initialData?.order_items || [])],
    order_item_addons: [...(initialData?.order_item_addons || [])],
    order_status_history: [...(initialData?.order_status_history || [])],
    payments: [...(initialData?.payments || [])],
    discounts: [...(initialData?.discounts || [])],
    discount_products: [...(initialData?.discount_products || [])],
    discount_categories: [...(initialData?.discount_categories || [])],
    customizations: [...(initialData?.customizations || [])],
    customization_assets: [...(initialData?.customization_assets || [])],
    domain_events: [...(initialData?.domain_events || [])],
    audit_logs: [...(initialData?.audit_logs || [])],
    reviews: [...(initialData?.reviews || [])],
    review_images: [...(initialData?.review_images || [])],
    stock_notifications: [...(initialData?.stock_notifications || [])],
  };

  const rpcHandlers: Record<string, Function> = {
    create_admin_bundle: (args: any) => {
      const {
        p_org_id, p_name, p_slug, p_description, p_sku, p_selling_price, p_cost_price, p_status, p_category_ids, p_images, p_components
      } = args;

      if (!p_components || p_components.length === 0) {
        throw new Error('A bundle must contain at least one component product.');
      }

      const bundleId = `bundle-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newProduct = {
        id: bundleId,
        organization_id: p_org_id,
        name: p_name,
        slug: p_slug,
        description: p_description || null,
        sku: p_sku || null,
        product_type: 'bundle',
        status: p_status || 'draft',
        selling_price: p_selling_price,
        cost_price: p_cost_price,
        requires_customization: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.products.push(newProduct);

      if (p_category_ids && p_category_ids.length > 0) {
        for (const catId of p_category_ids) {
          store.product_categories.push({ product_id: bundleId, category_id: catId });
        }
      }

      if (p_images && p_images.length > 0) {
        for (const img of p_images) {
          store.product_images.push({
            id: `img-${Math.random().toString(36).substring(2, 7)}`,
            product_id: bundleId,
            storage_path: img.storage_path,
            alt_text: img.alt_text || null,
            sort_order: img.sort_order || 0,
          });
        }
      }

      for (const comp of p_components) {
        const compProd = store.products.find((p) => p.id === comp.component_product_id);
        if (!compProd) {
          throw new Error(`Component product ${comp.component_product_id} does not exist`);
        }
        if (compProd.organization_id !== p_org_id) {
          throw new Error('Bundle and component products must belong to the same organization');
        }
        if (compProd.product_type === 'bundle') {
          throw new Error('A bundle cannot contain another bundle');
        }

        store.bundle_items.push({
          id: `bi-${Math.random().toString(36).substring(2, 7)}`,
          bundle_product_id: bundleId,
          component_product_id: comp.component_product_id,
          quantity: comp.quantity || 1,
          created_at: new Date().toISOString(),
        });
      }

      return bundleId;
    },

    update_admin_bundle: (args: any) => {
      const {
        p_bundle_id, p_org_id, p_name, p_slug, p_description, p_sku, p_selling_price, p_cost_price, p_status, p_category_ids, p_images, p_components
      } = args;

      const existing = store.products.find((p) => p.id === p_bundle_id);
      if (!existing) throw new Error(`Bundle product ${p_bundle_id} does not exist`);
      if (existing.organization_id !== p_org_id) throw new Error('Unauthorized');
      if (existing.product_type !== 'bundle') throw new Error('Target product is not a bundle');

      existing.name = p_name;
      existing.slug = p_slug;
      existing.description = p_description;
      existing.sku = p_sku;
      existing.selling_price = p_selling_price;
      existing.cost_price = p_cost_price;
      existing.status = p_status;
      existing.updated_at = new Date().toISOString();

      if (p_category_ids !== undefined && p_category_ids !== null) {
        store.product_categories = store.product_categories.filter((pc) => pc.product_id !== p_bundle_id);
        for (const catId of p_category_ids) {
          store.product_categories.push({ product_id: p_bundle_id, category_id: catId });
        }
      }

      if (p_images !== undefined && p_images !== null) {
        store.product_images = store.product_images.filter((img) => img.product_id !== p_bundle_id);
        for (const img of p_images) {
          store.product_images.push({
            id: `img-${Math.random().toString(36).substring(2, 7)}`,
            product_id: p_bundle_id,
            storage_path: img.storage_path,
            alt_text: img.alt_text || null,
            sort_order: img.sort_order || 0,
          });
        }
      }

      if (p_components !== undefined && p_components !== null) {
        if (p_components.length === 0) throw new Error('A bundle must contain at least one component product.');
        store.bundle_items = store.bundle_items.filter((bi) => bi.bundle_product_id !== p_bundle_id);
        for (const comp of p_components) {
          const compProd = store.products.find((p) => p.id === comp.component_product_id);
          if (!compProd) throw new Error(`Component product ${comp.component_product_id} does not exist`);
          if (compProd.organization_id !== p_org_id) throw new Error('Bundle and component products must belong to the same organization');
          if (compProd.product_type === 'bundle') throw new Error('A bundle cannot contain another bundle');

          store.bundle_items.push({
            id: `bi-${Math.random().toString(36).substring(2, 7)}`,
            bundle_product_id: p_bundle_id,
            component_product_id: comp.component_product_id,
            quantity: comp.quantity || 1,
            created_at: new Date().toISOString(),
          });
        }
      }

      return p_bundle_id;
    },

    duplicate_admin_bundle: (args: any) => {
      const { p_bundle_id, p_org_id, p_new_name, p_new_slug, p_new_sku } = args;
      const source = store.products.find((p) => p.id === p_bundle_id);
      if (!source) throw new Error(`Source bundle ${p_bundle_id} does not exist`);
      if (source.organization_id !== p_org_id) throw new Error('Unauthorized');
      if (source.product_type !== 'bundle') throw new Error('Source product is not a bundle');

      const newBundleId = `bundle-dup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      store.products.push({
        id: newBundleId,
        organization_id: p_org_id,
        name: p_new_name,
        slug: p_new_slug,
        description: source.description,
        sku: p_new_sku || null,
        product_type: 'bundle',
        status: 'draft',
        selling_price: source.selling_price,
        cost_price: source.cost_price,
        requires_customization: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const sourceCategories = store.product_categories.filter((pc) => pc.product_id === p_bundle_id);
      for (const sc of sourceCategories) {
        store.product_categories.push({ product_id: newBundleId, category_id: sc.category_id });
      }

      const sourceImages = store.product_images.filter((img) => img.product_id === p_bundle_id);
      for (const img of sourceImages) {
        store.product_images.push({
          id: `img-${Math.random().toString(36).substring(2, 7)}`,
          product_id: newBundleId,
          storage_path: img.storage_path,
          alt_text: img.alt_text,
          sort_order: img.sort_order,
        });
      }

      const sourceItems = store.bundle_items.filter((bi) => bi.bundle_product_id === p_bundle_id);
      for (const bi of sourceItems) {
        store.bundle_items.push({
          id: `bi-${Math.random().toString(36).substring(2, 7)}`,
          bundle_product_id: newBundleId,
          component_product_id: bi.component_product_id,
          quantity: bi.quantity,
          created_at: new Date().toISOString(),
        });
      }

      return newBundleId;
    },

    create_admin_manual_order: (args: any) => {
      const {
        p_org_id,
        p_customer,
        p_shipping_address,
        p_items,
        p_location_id,
        p_warehouse_id,
        p_manual_order_channel,
        p_discount_code,
        p_shipping_fee,
      } = args;

      if (!p_customer?.email) throw new Error('Customer email is required for manual order creation.');
      if (!p_items || p_items.length === 0) throw new Error('Manual order must contain at least one product item.');

      const productIds = p_items.map((i: any) => i.product_id);
      if (new Set(productIds).size !== productIds.length) {
        throw new Error('Order items cannot contain duplicate product IDs. Combine quantities into a single item.');
      }

      let subtotal = 0;
      for (const item of p_items) {
        const prod = store.products.find((p) => p.id === item.product_id);
        if (!prod) throw new Error(`Product ${item.product_id} does not exist`);
        if (prod.organization_id !== p_org_id)
          throw new Error(`Product ${item.product_id} belongs to another organization`);
        subtotal += Number(prod.selling_price || 0) * Number(item.quantity || 1);
      }

      let discountAmount = 0;
      let discountId = null;
      let discountCode = null;
      if (p_discount_code) {
        const disc = store.discounts.find(
          (d) =>
            d.organization_id === p_org_id &&
            d.code?.toLowerCase() === p_discount_code.toLowerCase()
        );
        if (!disc) throw new Error(`Discount code "${p_discount_code}" is invalid for this organization.`);
        if (disc.active === false || disc.is_active === false) throw new Error(`Discount code "${p_discount_code}" is inactive.`);
        if (disc.expires_at && new Date(disc.expires_at) < new Date()) throw new Error(`Discount code "${p_discount_code}" has expired.`);
        if (disc.minimum_order_amount && subtotal < disc.minimum_order_amount) throw new Error(`Order subtotal does not meet minimum order requirement.`);
        
        discountId = disc.id;
        discountCode = disc.code;
        const dType = disc.type || disc.discount_type;
        const dValue = disc.value ?? disc.discount_value;
        if (dType === 'percentage') {
          discountAmount = subtotal * (dValue / 100.0);
        } else if (dType === 'fixed_amount') {
          discountAmount = Math.min(subtotal, dValue);
        }
      }

      const shippingFee = Number(p_shipping_fee || 0);
      const total = Math.max(0, subtotal - discountAmount + shippingFee);

      const orderId = `ord-m-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const orderNumber = `ORD-M-${Date.now()}`;
      const token = `mpr_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
      const reqId = `opr-${Date.now()}`;

      const existingCust = store.customers.find(
        (c) => c.organization_id === p_org_id && c.email?.toLowerCase() === p_customer.email.toLowerCase()
      );

      const newOrder = {
        id: orderId,
        organization_id: p_org_id,
        order_number: orderNumber,
        order_source: 'manual',
        manual_order_channel: p_manual_order_channel || 'instagram',
        customer_id: existingCust?.id || null,
        email: p_customer.email,
        first_name: p_customer.first_name || '',
        last_name: p_customer.last_name || '',
        phone: p_customer.phone || '',
        shipping_address: p_shipping_address,
        location_id: p_location_id || null,
        warehouse_id: p_warehouse_id || null,
        status: 'created',
        subtotal,
        discount_total: discountAmount,
        discount_id: discountId,
        discount_code: discountCode,
        shipping_fee: shippingFee,
        total,
        placed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.orders.push(newOrder);

      for (const item of p_items) {
        const prod = store.products.find((p) => p.id === item.product_id);
        const oiId = `oi-${Math.random().toString(36).substring(2, 7)}`;
        store.order_items.push({
          id: oiId,
          order_id: orderId,
          product_id: item.product_id,
          product_name: prod.name,
          quantity: item.quantity,
          unit_price: prod.selling_price,
          total: prod.selling_price * item.quantity,
        });

        if (prod.product_type === 'bundle') {
          const comps = store.bundle_items.filter((bi) => bi.bundle_product_id === item.product_id);
          for (const c of comps) {
            const compProd = store.products.find((p) => p.id === c.component_product_id);
            store.order_item_bundle_components.push({
              id: `oibc-${Math.random().toString(36).substring(2, 7)}`,
              order_item_id: oiId,
              component_product_id: c.component_product_id,
              product_name: compProd?.name || 'Component',
              sku: compProd?.sku || null,
              quantity_per_bundle: c.quantity,
              total_quantity: c.quantity * item.quantity,
              unit_cost_price: compProd?.cost_price || 0,
            });
          }
        }
      }

      store.order_payment_requests.push({
        id: reqId,
        organization_id: p_org_id,
        order_id: orderId,
        token,
        status: 'pending',
        amount: total,
        currency: 'NGN',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return {
        order_id: orderId,
        order_number: orderNumber,
        payment_request_id: reqId,
        token,
        subtotal,
        discount_total: discountAmount,
        shipping_fee: shippingFee,
        total,
      };
    },
    reserve_inventory: ({ p_warehouse_id, p_product_id, p_quantity, p_reference_type, p_reference_id, p_expires_at }: any) => {
      const inv = store.inventory.find(
        (i) => i.warehouse_id === p_warehouse_id && i.product_id === p_product_id
      );
      if (!inv) {
        throw new Error('Inventory record not found');
      }
      const available = (inv.quantity_on_hand || inv.quantity || 0) - (inv.quantity_reserved || inv.reserved_quantity || 0);
      if (available < p_quantity) {
        throw new Error('Insufficient available stock to reserve');
      }
      inv.reserved_quantity = (inv.reserved_quantity || inv.quantity_reserved || 0) + p_quantity;
      inv.quantity_reserved = inv.reserved_quantity;
      const reservation = {
        id: `res-${Math.random().toString(36).substring(2, 9)}`,
        warehouse_id: p_warehouse_id,
        product_id: p_product_id,
        quantity: p_quantity,
        status: 'active',
        reference_type: p_reference_type,
        reference_id: p_reference_id,
        expires_at: p_expires_at || new Date(Date.now() + 45 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      store.inventory_reservations.push(reservation);
      return reservation;
    },
    release_inventory_reservation: ({ p_reservation_id }: any) => {
      const res = store.inventory_reservations.find((r) => r.id === p_reservation_id);
      if (!res || res.status !== 'active') return false;
      res.status = 'released';
      const inv = store.inventory.find(
        (i) => i.warehouse_id === res.warehouse_id && i.product_id === res.product_id
      );
      if (inv) {
        inv.reserved_quantity = Math.max(0, (inv.reserved_quantity || inv.quantity_reserved || 0) - res.quantity);
        inv.quantity_reserved = inv.reserved_quantity;
      }
      return true;
    },
    commit_inventory_reservation: ({ p_reservation_id }: any) => {
      const res = store.inventory_reservations.find((r) => r.id === p_reservation_id);
      if (!res || res.status !== 'active') return false;
      res.status = 'committed';
      const inv = store.inventory.find(
        (i) => i.warehouse_id === res.warehouse_id && i.product_id === res.product_id
      );
      if (inv) {
        inv.reserved_quantity = Math.max(0, (inv.reserved_quantity || inv.quantity_reserved || 0) - res.quantity);
        inv.quantity_reserved = inv.reserved_quantity;
        inv.quantity = Math.max(0, (inv.quantity || inv.quantity_on_hand || 0) - res.quantity);
        inv.quantity_on_hand = inv.quantity;
      }
      return true;
    },
    expire_inventory_reservation: ({ p_reservation_id }: any) => {
      const res = store.inventory_reservations.find((r) => r.id === p_reservation_id);
      if (!res || res.status !== 'active') return false;
      res.status = 'expired';
      const inv = store.inventory.find(
        (i) => i.warehouse_id === res.warehouse_id && i.product_id === res.product_id
      );
      if (inv) {
        inv.reserved_quantity = Math.max(0, (inv.reserved_quantity || inv.quantity_reserved || 0) - res.quantity);
        inv.quantity_reserved = inv.reserved_quantity;
      }
      return true;
    },
    expire_inventory_reservations: () => {
      const now = new Date().toISOString();
      let count = 0;
      for (const res of store.inventory_reservations) {
        if (res.status === 'active' && res.expires_at <= now) {
          res.status = 'expired';
          const inv = store.inventory.find(
            (i) => i.warehouse_id === res.warehouse_id && i.product_id === res.product_id
          );
          if (inv) {
            inv.reserved_quantity = Math.max(0, (inv.reserved_quantity || inv.quantity_reserved || 0) - res.quantity);
            inv.quantity_reserved = inv.reserved_quantity;
          }
          count++;
        }
      }
      return count;
    },
    increment_discount_usage: ({ p_discount_id, p_organization_id }: { p_discount_id: string; p_organization_id?: string }) => {
      const disc = store.discounts.find((d) => d.id === p_discount_id);
      if (!disc || !disc.active) return false;
      if (p_organization_id && disc.organization_id && disc.organization_id !== p_organization_id) return false;
      if (disc.usage_limit !== null && disc.usage_limit !== undefined && disc.usage_count >= disc.usage_limit) {
        return false;
      }
      disc.usage_count = (disc.usage_count || 0) + 1;
      return true;
    },
  };

  const client = {
    _store: store,
    auth: {
      signInWithOtp: async ({ email }: { email: string }) => {
        return { data: { user: null, session: null }, error: null };
      },
      verifyOtp: async ({ email, token }: { email: string; token: string }) => {
        if (token === '000000' || token.length < 4) {
          return { data: { user: null, session: null }, error: { message: 'Invalid OTP' } };
        }
        const user = {
          id: `usr_${Math.random().toString(36).substring(2, 9)}`,
          email,
          user_metadata: { first_name: 'Auth', last_name: 'User' },
        };
        const session = { access_token: `mock_jwt_${Date.now()}` };
        return { data: { user, session }, error: null };
      },
      signInWithOAuth: async ({ provider }: { provider: string }) => {
        return { data: { url: `https://accounts.google.com/o/oauth2/auth?mock=1` }, error: null };
      },
      exchangeCodeForSession: async (code: string) => {
        if (code === 'invalid') {
          return { data: { user: null, session: null }, error: { message: 'Invalid code' } };
        }
        const user = {
          id: `usr_oauth_${Math.random().toString(36).substring(2, 9)}`,
          email: 'oauth.user@example.com',
          user_metadata: { full_name: 'Google User' },
        };
        return { data: { user, session: { access_token: `mock_jwt_${Date.now()}` } }, error: null };
      },
      getUser: async (token?: string) => {
        if (!token || token === 'invalid') {
          return { data: { user: null }, error: { message: 'Unauthorized' } };
        }
        return {
          data: {
            user: {
              id: 'usr_mock_123',
              email: 'mock.customer@example.com',
              user_metadata: { first_name: 'Mock', last_name: 'Customer' },
            },
          },
          error: null,
        };
      },
      admin: {
        deleteUser: async (userId: string) => {
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
    rpc: async (fnName: string, args: any) => {
      const handler = rpcHandlers[fnName];
      if (!handler) {
        return { data: null, error: { message: `RPC ${fnName} not found` } };
      }
      try {
        const result = handler(args);
        return { data: result, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err.message } };
      }
    },
    from: (table: string) => {
      let filteredData = [...((store as any)[table] || [])];

      const queryBuilder: any = {
        select: (columns: string = '*') => {
          if (columns.includes('warehouses!inner') || columns.includes('warehouses')) {
            filteredData = filteredData.map((row) => {
              const wh = store.warehouses.find((w) => w.id === row.warehouse_id);
              return {
                ...row,
                warehouses: wh ? { id: wh.id, name: wh.name, is_active: wh.is_active } : null,
              };
            });
          }
          if (columns.includes('orders(*)')) {
            filteredData = filteredData.map((row) => {
              const ord = store.orders.find((o) => o.id === row.order_id);
              return {
                ...row,
                orders: ord || null,
              };
            });
          }
          return queryBuilder;
        },
        eq: (col: string, val: any) => {
          if (col.startsWith('warehouses.')) {
            const subCol = col.replace('warehouses.', '');
            filteredData = filteredData.filter((r) => r.warehouses && r.warehouses[subCol] === val);
          } else {
            filteredData = filteredData.filter((r) => r[col] === val);
          }
          return queryBuilder;
        },
        in: (col: string, vals: any[]) => {
          filteredData = filteredData.filter((r) => vals.includes(r[col]));
          return queryBuilder;
        },
        order: (col: string, options?: { ascending?: boolean }) => {
          const asc = options?.ascending !== false;
          filteredData.sort((a, b) => {
            if (a[col] < b[col]) return asc ? -1 : 1;
            if (a[col] > b[col]) return asc ? 1 : -1;
            return 0;
          });
          return queryBuilder;
        },
        limit: (n: number) => {
          filteredData = filteredData.slice(0, n);
          return queryBuilder;
        },
        is: (col: string, val: any) => {
          filteredData = filteredData.filter((r) => r[col] === val || (val === null && (r[col] === null || r[col] === undefined)));
          return queryBuilder;
        },
        lte: (col: string, val: any) => {
          filteredData = filteredData.filter((r) => r[col] <= val);
          return queryBuilder;
        },
        gte: (col: string, val: any) => {
          filteredData = filteredData.filter((r) => r[col] >= val);
          return queryBuilder;
        },
        ilike: (col: string, pattern: string) => {
          const cleanPattern = pattern.replace(/%/g, '').toLowerCase();
          filteredData = filteredData.filter((r) =>
            typeof r[col] === 'string' && r[col].toLowerCase().includes(cleanPattern)
          );
          return queryBuilder;
        },
        insert: (records: any | any[]) => {
          const toInsert = Array.isArray(records) ? records : [records];
          const inserted = toInsert.map((rec) => {
            const row = {
              id: rec.id || `${table.substring(0, 3)}-${Math.random().toString(36).substring(2, 9)}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...rec,
            };
            if (!(store as any)[table]) {
              (store as any)[table] = [];
            }
            (store as any)[table].push(row);
            return row;
          });

          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null }),
              maybeSingle: async () => ({ data: inserted[0] || null, error: null }),
              data: inserted,
              error: null,
              then: (resolve: Function) => resolve({ data: inserted, error: null }),
            }),
            single: async () => ({ data: inserted[0], error: null }),
            maybeSingle: async () => ({ data: inserted[0] || null, error: null }),
            data: inserted,
            error: null,
            then: (resolve: Function) => resolve({ data: inserted, error: null }),
          };
        },
        update: (updates: any) => {
          const conditions: Array<[string, any]> = [];
          const inConditions: Array<[string, any[]]> = [];
          const executeUpdate = () => {
            const tableData = (store as any)[table] || [];
            for (const row of tableData) {
              const matchEq = conditions.every(([c, v]) => row[c] === v);
              const matchIn = inConditions.every(([c, vals]) => vals.includes(row[c]));
              if (matchEq && matchIn) {
                Object.assign(row, updates);
              }
            }
          };
          const builder: any = {
            eq: (col: string, val: any) => {
              conditions.push([col, val]);
              return builder;
            },
            in: (col: string, vals: any[]) => {
              inConditions.push([col, vals]);
              return builder;
            },
            select: () => ({
              single: async () => {
                executeUpdate();
                const tableData = (store as any)[table] || [];
                const matched = tableData.find((row: any) =>
                  conditions.every(([c, v]) => row[c] === v) &&
                  inConditions.every(([c, vals]) => vals.includes(row[c]))
                );
                return { data: matched || null, error: null };
              },
              maybeSingle: async () => {
                executeUpdate();
                const tableData = (store as any)[table] || [];
                const matched = tableData.find((row: any) =>
                  conditions.every(([c, v]) => row[c] === v) &&
                  inConditions.every(([c, vals]) => vals.includes(row[c]))
                );
                return { data: matched || null, error: null };
              },
              then: (resolve: any) => {
                executeUpdate();
                const tableData = (store as any)[table] || [];
                const matched = tableData.filter((row: any) =>
                  conditions.every(([c, v]) => row[c] === v) &&
                  inConditions.every(([c, vals]) => vals.includes(row[c]))
                );
                resolve({ data: matched, error: null });
              },
            }),
            then: (resolve: any) => {
              executeUpdate();
              resolve({ data: null, error: null });
            },
          };
          return builder;
        },
        delete: () => {
          const conditions: Array<[string, any]> = [];
          const inConditions: Array<[string, any[]]> = [];
          const executeDelete = () => {
            (store as any)[table] = ((store as any)[table] || []).filter((row: any) => {
              const matchEq = conditions.every(([c, v]) => row[c] === v);
              const matchIn = inConditions.every(([c, vals]) => vals.includes(row[c]));
              return !(matchEq && matchIn);
            });
          };
          const builder: any = {
            eq: (col: string, val: any) => {
              conditions.push([col, val]);
              return builder;
            },
            in: (col: string, vals: any[]) => {
              inConditions.push([col, vals]);
              return builder;
            },
            then: (resolve: any) => {
              executeDelete();
              resolve({ data: null, error: null });
            },
          };
          return builder;
        },
        single: async () => {
          const row = filteredData[0];
          if (!row) {
            return { data: null, error: { message: 'Row not found' } };
          }
          return { data: row, error: null };
        },
        maybeSingle: async () => {
          const row = filteredData[0] || null;
          return { data: row, error: null };
        },
        then: (resolve: Function) => {
          resolve({ data: filteredData, error: null });
        },
      };

      return queryBuilder;
    },
  };

  return client as unknown as SupabaseClient<Database> & { _store: typeof store };
}
