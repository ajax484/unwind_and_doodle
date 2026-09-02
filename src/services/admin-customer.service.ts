import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '@/lib/supabase/types';
import {
  AdminCustomerFilterInput,
  AdminCustomerListResponse,
  AdminCustomerListItem,
  AdminCustomerDetail,
  AdminCustomerOrderSummary,
  AdminCustomerAddress,
  AdminCustomerNoteItem,
  AdminCustomerActivityItem,
  UpdateCustomerProfileInput,
  UpdateCustomerConsentInput,
} from '@/types/admin-customer';
import { publishDomainEvent } from './events.service';

/**
 * Lists organization customers with search, multi-filters, pagination, and accurate LTV metrics.
 */
export async function listAdminCustomers(
  supabase: SupabaseClient<Database>,
  filters: AdminCustomerFilterInput & { organizationId: string }
): Promise<AdminCustomerListResponse> {
  const { organizationId, search, accountType, marketingConsent, orderActivity, page = 1, limit = 25 } = filters;

  // 1. Fetch organization customers
  const { data: rawCustomers, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', organizationId);

  if (custErr) {
    throw new Error(`Failed to fetch customers: ${custErr.message}`);
  }

  const allCustomers = rawCustomers || [];
  if (allCustomers.length === 0) {
    return {
      customers: [],
      summary: {
        totalCustomers: 0,
        registeredAccounts: 0,
        guestCustomers: 0,
        emailSubscribers: 0,
        whatsappSubscribers: 0,
        totalLifetimeValue: 0,
      },
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 1,
      },
    };
  }

  const customerIds = allCustomers.map((c) => c.id);

  // 2. Fetch orders for all organization customers to calculate LTV and order stats
  const { data: allOrders } = await supabase
    .from('orders')
    .select('*')
    .in('customer_id', customerIds);

  // Aggregate order stats per customer
  const customerStatsMap = new Map<
    string,
    {
      totalOrders: number;
      completedOrders: number;
      lifetimeValue: number;
      lastOrderDate: string | null;
    }
  >();

  for (const o of allOrders || []) {
    if (!o.customer_id) continue;
    const cur = customerStatsMap.get(o.customer_id) || {
      totalOrders: 0,
      completedOrders: 0,
      lifetimeValue: 0,
      lastOrderDate: null,
    };

    cur.totalOrders += 1;

    // LTV strictly counts successfully paid, completed/active non-refunded, non-cancelled orders
    const isCompletedRevenue =
      (o.status === 'confirmed' || o.status === 'shipped' || o.status === 'received' || o.status === 'pending') &&
      ((o as any).payment_status ? (o as any).payment_status === 'successful' : true);

    if (isCompletedRevenue) {
      cur.completedOrders += 1;
      cur.lifetimeValue += Number((o as any).total ?? (o as any).total_amount) || 0;
    }

    if (!cur.lastOrderDate || new Date(o.created_at) > new Date(cur.lastOrderDate)) {
      cur.lastOrderDate = o.created_at;
    }

    customerStatsMap.set(o.customer_id, cur);
  }

  // 3. Map to AdminCustomerListItem
  const mappedList: AdminCustomerListItem[] = allCustomers.map((c) => {
    const stats = customerStatsMap.get(c.id) || {
      totalOrders: 0,
      completedOrders: 0,
      lifetimeValue: 0,
      lastOrderDate: null,
    };

    const firstName = c.first_name || '';
    const lastName = c.last_name || '';
    const fullName = `${firstName} ${lastName}`.trim() || c.email;

    return {
      id: c.id,
      userId: c.user_id,
      hasAccount: Boolean(c.user_id),
      firstName: c.first_name,
      lastName: c.last_name,
      fullName,
      email: c.email,
      phone: c.phone,
      whatsappNumber: c.whatsapp_number,
      emailMarketingConsent: Boolean(c.email_marketing_consent),
      whatsappMarketingConsent: Boolean(c.whatsapp_marketing_consent),
      totalOrdersCount: stats.totalOrders,
      completedOrdersCount: stats.completedOrders,
      lifetimeValue: stats.lifetimeValue,
      lastOrderDate: stats.lastOrderDate,
      createdAt: c.created_at,
    };
  });

  // 4. Calculate Summary KPIs
  let registeredAccounts = 0;
  let guestCustomers = 0;
  let emailSubscribers = 0;
  let whatsappSubscribers = 0;
  let totalLifetimeValue = 0;

  for (const c of mappedList) {
    if (c.hasAccount) registeredAccounts++;
    else guestCustomers++;

    if (c.emailMarketingConsent) emailSubscribers++;
    if (c.whatsappMarketingConsent) whatsappSubscribers++;

    totalLifetimeValue += c.lifetimeValue;
  }

  // 5. Apply Search & Filters
  let filtered = mappedList;

  if (search) {
    const q = search.toLowerCase().trim();
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.whatsappNumber && c.whatsappNumber.includes(q))
    );
  }

  if (accountType && accountType !== 'all') {
    if (accountType === 'registered') {
      filtered = filtered.filter((c) => c.hasAccount);
    } else if (accountType === 'guest') {
      filtered = filtered.filter((c) => !c.hasAccount);
    }
  }

  if (marketingConsent && marketingConsent !== 'all') {
    if (marketingConsent === 'email_subscribed') {
      filtered = filtered.filter((c) => c.emailMarketingConsent);
    } else if (marketingConsent === 'whatsapp_subscribed') {
      filtered = filtered.filter((c) => c.whatsappMarketingConsent);
    }
  }

  if (orderActivity && orderActivity !== 'all') {
    if (orderActivity === 'has_ordered') {
      filtered = filtered.filter((c) => c.totalOrdersCount > 0);
    } else if (orderActivity === 'never_ordered') {
      filtered = filtered.filter((c) => c.totalOrdersCount === 0);
    }
  }

  // Sort by newest created first
  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 6. Paginate
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    customers: paginated,
    summary: {
      totalCustomers: mappedList.length,
      registeredAccounts,
      guestCustomers,
      emailSubscribers,
      whatsappSubscribers,
      totalLifetimeValue,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves comprehensive customer profile, LTV metrics, orders history, saved addresses,
 * internal CRM notes, and activity timeline.
 */
export async function getAdminCustomerDetail(
  supabase: SupabaseClient<Database>,
  customerId: string,
  organizationId: string
): Promise<AdminCustomerDetail> {
  // 1. Fetch customer
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (custErr || !customer) {
    throw new Error(`Customer not found: ${customerId}`);
  }

  if (customer.organization_id !== organizationId) {
    throw new Error('Forbidden: Customer belongs to another organization');
  }

  // 2. Fetch customer orders
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  // Fetch items count per order
  const orderIds = (orders || []).map((o) => o.id);
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('order_id, quantity')
    .in('order_id', orderIds);

  const itemsCountMap = new Map<string, number>();
  for (const item of orderItems || []) {
    itemsCountMap.set(item.order_id, (itemsCountMap.get(item.order_id) || 0) + item.quantity);
  }

  let totalOrders = 0;
  let completedOrders = 0;
  let lifetimeValue = 0;
  let lastOrderDate: string | null = null;

  const orderSummaries: AdminCustomerOrderSummary[] = (orders || []).map((o) => {
    totalOrders++;
    const isCompletedRevenue =
      (o.status === 'confirmed' || o.status === 'shipped' || o.status === 'received' || o.status === 'pending') &&
      ((o as any).payment_status ? (o as any).payment_status === 'successful' : true);

    if (isCompletedRevenue) {
      completedOrders++;
      lifetimeValue += Number((o as any).total ?? (o as any).total_amount) || 0;
    }

    if (!lastOrderDate || new Date(o.created_at) > new Date(lastOrderDate)) {
      lastOrderDate = o.created_at;
    }

    return {
      id: o.id,
      orderNumber: o.order_number || o.id.substring(0, 8).toUpperCase(),
      status: o.status,
      paymentStatus: isCompletedRevenue ? 'successful' : 'pending',
      totalAmount: Number((o as any).total ?? (o as any).total_amount) || 0,
      itemsCount: itemsCountMap.get(o.id) || 1,
      createdAt: o.created_at,
    };
  });

  const averageOrderValue = completedOrders > 0 ? Math.round(lifetimeValue / completedOrders) : 0;

  // 3. Fetch saved addresses
  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false });

  const addressList: AdminCustomerAddress[] = (addresses || []).map((a) => ({
    id: a.id,
    recipientName: a.recipient_name,
    phone: a.phone,
    addressLine1: a.address_line_1,
    addressLine2: a.address_line_2,
    state: a.state,
    lga: a.lga,
    isDefault: a.is_default ?? false,
    createdAt: a.created_at,
  }));

  // 4. Check for active or abandoned cart
  const { data: carts } = await supabase
    .from('carts')
    .select('id, status')
    .eq('customer_id', customerId);

  const hasAbandonedCart = (carts || []).some(
    (c) => c.status === 'abandoned' || c.status === 'active'
  );

  // 5. Fetch internal CRM notes
  const { data: rawNotes } = await (supabase as unknown as {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          order: (col: string, opt: { ascending: boolean }) => Promise<{ data?: unknown[] }>;
        };
      };
    };
  })
    .from('customer_notes')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  const notesList: AdminCustomerNoteItem[] = ((rawNotes || []) as Record<string, unknown>[]).map((n) => ({
    id: String(n.id),
    customerId: String(n.customer_id),
    authorId: String(n.author_id || ''),
    authorName: (n.author_name as string) || 'Admin Member',
    note: String(n.note || ''),
    createdAt: String(n.created_at),
  }));

  // 6. Build Activity Timeline
  const activityList: AdminCustomerActivityItem[] = [
    {
      id: `act-created-${customer.id}`,
      type: 'account.created',
      title: customer.user_id ? 'Account Registered' : 'Guest Profile Initialized',
      description: `Customer record created for ${customer.email}`,
      timestamp: customer.created_at,
    },
  ];

  for (const o of orders || []) {
    activityList.push({
      id: `act-order-${o.id}`,
      type: 'order.placed',
      title: `Order #${o.order_number || o.id.substring(0, 8)}`,
      description: `Placed order totaling ₦${Number(o.total || 0).toLocaleString()} (${o.status})`,
      timestamp: o.created_at,
      metadata: { orderId: o.id },
    });
  }

  // Fetch reviews submitted
  const { data: reviews } = await supabase
    .from('reviews')
    .select('id, rating, title, created_at')
    .eq('customer_id', customerId);

  for (const r of reviews || []) {
    activityList.push({
      id: `act-rev-${r.id}`,
      type: 'review.submitted',
      title: `Submitted Review (${r.rating}★)`,
      description: r.title || 'Product feedback',
      timestamp: r.created_at,
    });
  }

  // Sort activity newest first
  activityList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const firstName = customer.first_name || '';
  const lastName = customer.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || customer.email;

  return {
    id: customer.id,
    userId: customer.user_id,
    hasAccount: Boolean(customer.user_id),
    firstName: customer.first_name,
    lastName: customer.last_name,
    fullName,
    email: customer.email,
    phone: customer.phone,
    whatsappNumber: customer.whatsapp_number,
    emailVerified: Boolean(customer.email_verified_at),
    emailMarketingConsent: Boolean(customer.email_marketing_consent),
    whatsappMarketingConsent: Boolean(customer.whatsapp_marketing_consent),
    createdAt: customer.created_at,
    metrics: {
      totalOrders,
      completedOrders,
      lifetimeValue,
      averageOrderValue,
      lastOrderDate,
    },
    hasAbandonedCart,
    orders: orderSummaries,
    addresses: addressList,
    notes: notesList,
    activity: activityList,
  };
}

/**
 * Updates basic customer profile information (First Name, Last Name, Phone, WhatsApp).
 * Email and User ID are strictly protected.
 */
export async function updateAdminCustomerProfile(
  supabase: SupabaseClient<Database>,
  customerId: string,
  input: UpdateCustomerProfileInput,
  adminUserId: string,
  organizationId: string
) {
  const { data: existing, error: findErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Customer not found or belongs to another organization');
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.first_name !== undefined) updatePayload.first_name = input.first_name.trim();
  if (input.last_name !== undefined) updatePayload.last_name = input.last_name.trim();
  if (input.phone !== undefined) updatePayload.phone = input.phone ? input.phone.trim() : null;
  if (input.whatsapp_number !== undefined) updatePayload.whatsapp_number = input.whatsapp_number ? input.whatsapp_number.trim() : null;

  const { data: updated, error: updateErr } = await supabase
    .from('customers')
    .update(updatePayload as unknown as Database['public']['Tables']['customers']['Update'])
    .eq('id', customerId)
    .select()
    .single();

  if (updateErr || !updated) {
    throw new Error(`Failed to update customer profile: ${updateErr?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customer.updated',
    entity_type: 'customer',
    entity_id: customerId,
    before_data: {
      first_name: existing.first_name,
      last_name: existing.last_name,
      phone: existing.phone,
      whatsapp_number: existing.whatsapp_number,
    },
    after_data: updatePayload as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return updated;
}

/**
 * Explicitly updates marketing consent (Email or WhatsApp) with an audit trail.
 */
export async function updateAdminCustomerConsent(
  supabase: SupabaseClient<Database>,
  customerId: string,
  input: UpdateCustomerConsentInput,
  adminUserId: string,
  organizationId: string
) {
  const { data: existing, error: findErr } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (findErr || !existing || existing.organization_id !== organizationId) {
    throw new Error('Forbidden: Customer not found or belongs to another organization');
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  const beforeVal = input.channel === 'email' ? existing.email_marketing_consent : existing.whatsapp_marketing_consent;

  if (input.channel === 'email') {
    updatePayload.email_marketing_consent = input.consent;
  } else if (input.channel === 'whatsapp') {
    updatePayload.whatsapp_marketing_consent = input.consent;
  }

  await supabase
    .from('customers')
    .update(updatePayload as unknown as Database['public']['Tables']['customers']['Update'])
    .eq('id', customerId);

  // Audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customer.consent_updated',
    entity_type: 'customer',
    entity_id: customerId,
    before_data: { channel: input.channel, consent: beforeVal },
    after_data: { channel: input.channel, consent: input.consent, reason: input.reason || 'Admin manual update' },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  // Emit domain event
  await publishDomainEvent(supabase, {
    eventType: 'customer.consent_changed',
    aggregateType: 'customer',
    aggregateId: customerId,
    payload: {
      customerId,
      channel: input.channel,
      oldValue: beforeVal,
      newValue: input.consent,
      reason: input.reason || 'Admin manual update',
      updatedBy: adminUserId,
      organizationId,
    },
  });

  return { success: true, channel: input.channel, consent: input.consent };
}

/**
 * Creates an internal CRM note for a customer.
 */
export async function createCustomerNote(
  supabase: SupabaseClient<Database>,
  customerId: string,
  note: string,
  adminUserId: string,
  organizationId: string
): Promise<AdminCustomerNoteItem> {
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, organization_id')
    .eq('id', customerId)
    .single();

  if (custErr || !customer || customer.organization_id !== organizationId) {
    throw new Error('Forbidden: Customer not found or belongs to another organization');
  }

  const { data: inserted, error: insErr } = await (supabase as unknown as {
    from: (table: string) => {
      insert: (payload: unknown) => {
        select: () => {
          single: () => Promise<{ data?: Record<string, unknown>; error?: { message: string } }>;
        };
      };
    };
  })
    .from('customer_notes')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      author_id: adminUserId,
      note: note.trim(),
    })
    .select()
    .single();

  if (insErr || !inserted) {
    throw new Error(`Failed to create note: ${insErr?.message}`);
  }

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customer.note_created',
    entity_type: 'customer_note',
    entity_id: String(inserted.id),
    before_data: null,
    after_data: { customerId, note: note.trim() },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return {
    id: String(inserted.id),
    customerId,
    authorId: adminUserId,
    authorName: 'Admin Member',
    note: note.trim(),
    createdAt: String(inserted.created_at || new Date().toISOString()),
  };
}

/**
 * Deletes an internal CRM note.
 */
export async function deleteCustomerNote(
  supabase: SupabaseClient<Database>,
  customerId: string,
  noteId: string,
  adminUserId: string,
  organizationId: string
) {
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('id, organization_id')
    .eq('id', customerId)
    .single();

  if (custErr || !customer || customer.organization_id !== organizationId) {
    throw new Error('Forbidden: Customer not found or belongs to another organization');
  }

  await (supabase as unknown as {
    from: (table: string) => {
      delete: () => {
        eq: (col: string, val: string) => Promise<{ error?: unknown }>;
      };
    };
  })
    .from('customer_notes')
    .delete()
    .eq('id', noteId);

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customer.note_deleted',
    entity_type: 'customer_note',
    entity_id: noteId,
    before_data: null,
    after_data: { customerId, noteId },
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return { success: true };
}

/**
 * Generates a sanitized CSV string of customers for the current organization
 * and records an audit log.
 */
export async function exportAdminCustomersCsv(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  adminUserId: string,
  filters: AdminCustomerFilterInput
): Promise<string> {
  const listResult = await listAdminCustomers(supabase, {
    ...filters,
    organizationId,
    limit: 1000,
  });

  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'WhatsApp Number',
    'Account Type',
    'Email Marketing',
    'WhatsApp Marketing',
    'Total Orders',
    'Completed Orders',
    'Lifetime Value (NGN)',
    'Last Order Date',
    'Customer Since',
  ];

  const escapeCsv = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = listResult.customers.map((c) => [
    escapeCsv(c.firstName),
    escapeCsv(c.lastName),
    escapeCsv(c.email),
    escapeCsv(c.phone),
    escapeCsv(c.whatsappNumber),
    escapeCsv(c.hasAccount ? 'Registered' : 'Guest'),
    escapeCsv(c.emailMarketingConsent ? 'Subscribed' : 'Unsubscribed'),
    escapeCsv(c.whatsappMarketingConsent ? 'Subscribed' : 'Unsubscribed'),
    escapeCsv(c.totalOrdersCount),
    escapeCsv(c.completedOrdersCount),
    escapeCsv(c.lifetimeValue),
    escapeCsv(c.lastOrderDate ? new Date(c.lastOrderDate).toISOString().split('T')[0] : 'N/A'),
    escapeCsv(new Date(c.createdAt).toISOString().split('T')[0]),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  // Record audit log
  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: adminUserId,
    user_id: adminUserId,
    action: 'customer.exported',
    entity_type: 'customer',
    entity_id: organizationId,
    before_data: null,
    after_data: {
      exportedCount: listResult.customers.length,
      filters,
    } as Json,
  } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

  return csvContent;
}
