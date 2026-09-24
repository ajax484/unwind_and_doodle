import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import {
  SegmentRules,
  SegmentCondition,
  SegmentField,
  SegmentOperator,
  SegmentCustomer,
  SegmentCustomerOptions,
  SegmentCustomerPreviewResult,
  SegmentRuleValidationError,
} from '@/types/marketing';
import { ORDER_STATUS } from '@/lib/constants';
import { getSegmentById } from './marketing-segment.service';

// ============================================================================
// 1. VALIDATION LAYER
// ============================================================================

export const QUALIFYING_PURCHASE_ORDER_STATUSES: readonly string[] = [
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.RECEIVED,
];

const SUPPORTED_CUSTOMER_FIELDS: readonly SegmentField[] = [
  'email',
  'first_name',
  'last_name',
  'email_marketing_consent',
  'whatsapp_marketing_consent',
  'created_at',
];

const SUPPORTED_PURCHASE_FIELDS: readonly SegmentField[] = [
  'last_order_at',
  'order_count',
  'total_spent',
];

const SUPPORTED_PRODUCT_FIELDS: readonly SegmentField[] = [
  'purchased_product',
  'not_purchased_product',
  'purchased_any_product',
  'purchased_all_products',
];

const SUPPORTED_LOCATION_FIELDS: readonly SegmentField[] = [
  'shipping_state',
  'shipping_city',
];

const STRING_OPERATORS: readonly SegmentOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'is_null',
  'is_not_null',
];

const BOOLEAN_OPERATORS: readonly SegmentOperator[] = ['equals', 'not_equals'];

const DATE_OPERATORS: readonly SegmentOperator[] = [
  'equals',
  'before',
  'after',
  'between',
  'is_null',
  'is_not_null',
];

const NUMERIC_OPERATORS: readonly SegmentOperator[] = [
  'equals',
  'not_equals',
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'between',
];

const LOCATION_OPERATORS: readonly SegmentOperator[] = [
  'equals',
  'not_equals',
  'contains',
  'starts_with',
  'ends_with',
  'is_null',
  'is_not_null',
  'in',
];

function isValidDateString(val: unknown): boolean {
  if (typeof val !== 'string' || !val.trim()) return false;
  const timestamp = Date.parse(val);
  return !Number.isNaN(timestamp);
}

/**
 * Validates segment rules structure, field-operator compatibility, and value types.
 * Throws SegmentRuleValidationError with clear diagnostics if invalid.
 */
export function validateSegmentRules(rules: unknown): SegmentRules {
  if (!rules || typeof rules !== 'object' || Array.isArray(rules)) {
    throw new SegmentRuleValidationError('Segment rules must be an object');
  }

  const r = rules as Record<string, unknown>;

  if (r.match !== 'all' && r.match !== 'any') {
    throw new SegmentRuleValidationError('Segment rules match must be either "all" or "any"');
  }

  if (!Array.isArray(r.conditions) || r.conditions.length === 0) {
    throw new SegmentRuleValidationError('Segment rules conditions must be a non-empty array');
  }

  const conditions: SegmentCondition[] = [];

  for (let i = 0; i < r.conditions.length; i++) {
    const rawCond = r.conditions[i];
    if (!rawCond || typeof rawCond !== 'object' || Array.isArray(rawCond)) {
      throw new SegmentRuleValidationError(`Condition at index ${i} must be an object`);
    }

    const cond = rawCond as Record<string, unknown>;
    const field = cond.field as SegmentField;
    const operator = cond.operator as SegmentOperator;
    const value = cond.value;

    const isCustomerField = SUPPORTED_CUSTOMER_FIELDS.includes(field);
    const isPurchaseField = SUPPORTED_PURCHASE_FIELDS.includes(field);
    const isProductField = SUPPORTED_PRODUCT_FIELDS.includes(field);
    const isLocationField = SUPPORTED_LOCATION_FIELDS.includes(field);

    if (!isCustomerField && !isPurchaseField && !isProductField && !isLocationField) {
      throw new SegmentRuleValidationError(
        `Condition at index ${i} has unsupported field "${String(field)}"`
      );
    }

    // Validate operator compatibility
    if (['email', 'first_name', 'last_name'].includes(field)) {
      if (!STRING_OPERATORS.includes(operator)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: ${STRING_OPERATORS.join(', ')}`
        );
      }
      if (operator !== 'is_null' && operator !== 'is_not_null') {
        if (typeof value !== 'string') {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "${operator}" requires a string value`
          );
        }
      }
    } else if (['email_marketing_consent', 'whatsapp_marketing_consent'].includes(field)) {
      if (!BOOLEAN_OPERATORS.includes(operator)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: ${BOOLEAN_OPERATORS.join(', ')}`
        );
      }
      if (typeof value !== 'boolean') {
        throw new SegmentRuleValidationError(
          `Field "${field}" with operator "${operator}" requires a boolean value`
        );
      }
    } else if (['created_at', 'last_order_at'].includes(field)) {
      if (!DATE_OPERATORS.includes(operator)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: ${DATE_OPERATORS.join(', ')}`
        );
      }
      if (operator === 'between') {
        if (!Array.isArray(value) || value.length !== 2 || !isValidDateString(value[0]) || !isValidDateString(value[1])) {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "between" requires an array of 2 valid date strings`
          );
        }
      } else if (operator !== 'is_null' && operator !== 'is_not_null') {
        if (!isValidDateString(value)) {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "${operator}" requires a valid ISO date string`
          );
        }
      }
    } else if (['order_count', 'total_spent'].includes(field)) {
      if (!NUMERIC_OPERATORS.includes(operator)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: ${NUMERIC_OPERATORS.join(', ')}`
        );
      }
      if (operator === 'between') {
        if (
          !Array.isArray(value) ||
          value.length !== 2 ||
          typeof value[0] !== 'number' ||
          !Number.isFinite(value[0]) ||
          typeof value[1] !== 'number' ||
          !Number.isFinite(value[1])
        ) {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "between" requires an array of 2 finite numbers`
          );
        }
      } else if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" with operator "${operator}" requires a finite number value`
        );
      }
    } else if (['purchased_product', 'not_purchased_product'].includes(field)) {
      if (operator !== 'equals') {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: equals`
        );
      }
      if (typeof value !== 'string' || !value.trim()) {
        throw new SegmentRuleValidationError(
          `Field "${field}" requires a non-empty product ID string`
        );
      }
    } else if (['purchased_any_product', 'purchased_all_products'].includes(field)) {
      if (operator !== 'in') {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: in`
        );
      }
      if (
        !Array.isArray(value) ||
        value.length === 0 ||
        !value.every((v) => typeof v === 'string' && v.trim().length > 0)
      ) {
        throw new SegmentRuleValidationError(
          `Field "${field}" requires a non-empty array of product ID strings`
        );
      }
    } else if (['shipping_state', 'shipping_city'].includes(field)) {
      if (!LOCATION_OPERATORS.includes(operator)) {
        throw new SegmentRuleValidationError(
          `Field "${field}" does not support operator "${operator}". Supported: ${LOCATION_OPERATORS.join(', ')}`
        );
      }
      if (operator === 'in') {
        if (
          !Array.isArray(value) ||
          value.length === 0 ||
          !value.every((v) => typeof v === 'string' && v.trim().length > 0)
        ) {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "in" requires a non-empty array of location strings`
          );
        }
      } else if (operator !== 'is_null' && operator !== 'is_not_null') {
        if (typeof value !== 'string' || !value.trim()) {
          throw new SegmentRuleValidationError(
            `Field "${field}" with operator "${operator}" requires a non-empty string value`
          );
        }
      }
    }

    conditions.push({ field, operator, value });
  }

  return {
    match: r.match as 'all' | 'any',
    conditions,
  };
}

// ============================================================================
// 2. CONDITION EVALUATION ENGINE
// ============================================================================

interface CustomerCohortData {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_marketing_consent: boolean;
  whatsapp_marketing_consent: boolean;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  shipping_state: string | null;
  shipping_city: string | null;
  purchasedProductIds: Set<string>;
}

function normalizeLocation(val: unknown): string {
  return typeof val === 'string' ? val.trim().toLowerCase() : '';
}

function evaluateCondition(
  customer: CustomerCohortData,
  condition: SegmentCondition,
  validTenantProductIds: Set<string>
): boolean {
  const { field, operator, value } = condition;

  // 1. Product predicates
  if (SUPPORTED_PRODUCT_FIELDS.includes(field)) {
    switch (field) {
      case 'purchased_product': {
        const targetId = typeof value === 'string' ? value.trim() : '';
        if (!targetId || !validTenantProductIds.has(targetId)) {
          return false;
        }
        return customer.purchasedProductIds.has(targetId);
      }

      case 'not_purchased_product': {
        const targetId = typeof value === 'string' ? value.trim() : '';
        // Fail-safe: if referenced product is not in tenant's catalog, do NOT match anyone
        if (!targetId || !validTenantProductIds.has(targetId)) {
          return false;
        }
        return !customer.purchasedProductIds.has(targetId);
      }

      case 'purchased_any_product': {
        if (!Array.isArray(value) || value.length === 0) return false;
        return value.some((pid) => {
          const id = typeof pid === 'string' ? pid.trim() : '';
          return id && validTenantProductIds.has(id) && customer.purchasedProductIds.has(id);
        });
      }

      case 'purchased_all_products': {
        if (!Array.isArray(value) || value.length === 0) return false;
        return value.every((pid) => {
          const id = typeof pid === 'string' ? pid.trim() : '';
          return id && validTenantProductIds.has(id) && customer.purchasedProductIds.has(id);
        });
      }

      default:
        return false;
    }
  }

  // 2. Location predicates
  if (SUPPORTED_LOCATION_FIELDS.includes(field)) {
    const rawVal = field === 'shipping_state' ? customer.shipping_state : customer.shipping_city;
    const locVal = normalizeLocation(rawVal);

    if (operator === 'is_null') {
      return !locVal;
    }
    if (operator === 'is_not_null') {
      return Boolean(locVal);
    }
    if (!locVal) return false;

    if (operator === 'in') {
      if (!Array.isArray(value)) return false;
      const targets = value.map((v) => normalizeLocation(v)).filter(Boolean);
      return targets.includes(locVal);
    }

    const target = normalizeLocation(value);
    if (!target) return false;

    switch (operator) {
      case 'equals':
        return locVal === target;
      case 'not_equals':
        return locVal !== target;
      case 'contains':
        return locVal.includes(target);
      case 'starts_with':
        return locVal.startsWith(target);
      case 'ends_with':
        return locVal.endsWith(target);
      default:
        return false;
    }
  }

  // 3. Customer & Purchase scalar fields
  const fieldValue = customer[field as keyof Omit<CustomerCohortData, 'shipping_state' | 'shipping_city' | 'purchasedProductIds'>];

  switch (operator) {
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;

    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;

    case 'equals': {
      if (typeof fieldValue === 'boolean') {
        return fieldValue === value;
      }
      if (typeof fieldValue === 'number') {
        return fieldValue === Number(value);
      }
      if (typeof fieldValue === 'string') {
        if (field === 'created_at' || field === 'last_order_at') {
          if (!isValidDateString(value)) return false;
          return new Date(fieldValue).getTime() === new Date(value as string).getTime();
        }
        return fieldValue.toLowerCase() === String(value).toLowerCase();
      }
      return false;
    }

    case 'not_equals': {
      if (typeof fieldValue === 'boolean') {
        return fieldValue !== value;
      }
      if (typeof fieldValue === 'number') {
        return fieldValue !== Number(value);
      }
      if (typeof fieldValue === 'string') {
        return fieldValue.toLowerCase() !== String(value).toLowerCase();
      }
      return fieldValue !== value;
    }

    case 'contains':
      if (typeof fieldValue !== 'string') return false;
      return fieldValue.toLowerCase().includes(String(value).toLowerCase());

    case 'starts_with':
      if (typeof fieldValue !== 'string') return false;
      return fieldValue.toLowerCase().startsWith(String(value).toLowerCase());

    case 'ends_with':
      if (typeof fieldValue !== 'string') return false;
      return fieldValue.toLowerCase().endsWith(String(value).toLowerCase());

    case 'before':
      if (!fieldValue || typeof fieldValue !== 'string') return false;
      return new Date(fieldValue).getTime() < new Date(value as string).getTime();

    case 'after':
      if (!fieldValue || typeof fieldValue !== 'string') return false;
      return new Date(fieldValue).getTime() > new Date(value as string).getTime();

    case 'between': {
      if (field === 'created_at' || field === 'last_order_at') {
        if (!fieldValue || typeof fieldValue !== 'string') return false;
        const [start, end] = value as [string, string];
        const t = new Date(fieldValue).getTime();
        return t >= new Date(start).getTime() && t <= new Date(end).getTime();
      }
      if (typeof fieldValue === 'number') {
        const [min, max] = value as [number, number];
        return fieldValue >= min && fieldValue <= max;
      }
      return false;
    }

    case 'greater_than':
      if (typeof fieldValue !== 'number') return false;
      return fieldValue > Number(value);

    case 'less_than':
      if (typeof fieldValue !== 'number') return false;
      return fieldValue < Number(value);

    case 'greater_than_or_equal':
      if (typeof fieldValue !== 'number') return false;
      return fieldValue >= Number(value);

    case 'less_than_or_equal':
      if (typeof fieldValue !== 'number') return false;
      return fieldValue <= Number(value);

    case 'in': {
      if (!Array.isArray(value)) return false;
      return value.map((v) => String(v).toLowerCase()).includes(String(fieldValue).toLowerCase());
    }

    default:
      return false;
  }
}

/**
 * Resolves customers directly from a validated SegmentRules definition,
 * strictly enforcing email_marketing_consent = true and organization isolation.
 */
export async function resolveCohortRules(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  rules: SegmentRules
): Promise<SegmentCustomer[]> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }

  // 1. Query organization customers strictly enforcing email_marketing_consent = true
  const { data: rawCustomers, error: custErr } = await supabase
    .from('customers')
    .select('id, email, first_name, last_name, email_marketing_consent, whatsapp_marketing_consent, created_at')
    .eq('organization_id', organizationId)
    .eq('email_marketing_consent', true);

  if (custErr) {
    throw new Error(`Failed to fetch customers for segmentation: ${custErr.message}`);
  }

  const customers = rawCustomers || [];
  if (customers.length === 0) {
    return [];
  }

  // 2. Fetch valid orders for the organization (qualifying paid/completed orders)
  const { data: rawOrders, error: orderErr } = await supabase
    .from('orders')
    .select('id, customer_id, total, status, shipping_address, created_at')
    .eq('organization_id', organizationId);

  if (orderErr) {
    throw new Error(`Failed to fetch orders for segmentation: ${orderErr.message}`);
  }

  // Filter qualifying paid/completed orders (confirmed, shipped, received)
  const validOrders = (rawOrders || []).filter(
    (o) => o.customer_id && QUALIFYING_PURCHASE_ORDER_STATUSES.includes(o.status)
  );

  // Aggregate purchase history per customer
  const customerOrderMap = new Map<
    string,
    { order_count: number; total_spent: number; last_order_at: string | null }
  >();

  for (const o of validOrders) {
    const custId = o.customer_id!;
    const cur = customerOrderMap.get(custId) || {
      order_count: 0,
      total_spent: 0,
      last_order_at: null,
    };

    cur.order_count += 1;
    cur.total_spent += Number(o.total) || 0;

    if (!cur.last_order_at || new Date(o.created_at).getTime() > new Date(cur.last_order_at).getTime()) {
      cur.last_order_at = o.created_at;
    }

    customerOrderMap.set(custId, cur);
  }

  // 3. Resolve shipping location (latest qualifying order shipping address)
  const customerLatestLocationMap = new Map<
    string,
    { state: string | null; city: string | null }
  >();

  const sortedValidOrders = [...validOrders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const o of sortedValidOrders) {
    const custId = o.customer_id!;
    if (!customerLatestLocationMap.has(custId)) {
      let state: string | null = null;
      let city: string | null = null;

      if (o.shipping_address && typeof o.shipping_address === 'object') {
        const addr = o.shipping_address as Record<string, unknown>;
        if (typeof addr.state === 'string' && addr.state.trim()) {
          state = addr.state.trim();
        }
        if (typeof addr.city === 'string' && addr.city.trim()) {
          city = addr.city.trim();
        }
      }

      customerLatestLocationMap.set(custId, { state, city });
    }
  }

  // Fallback to customer_addresses for customers who haven't placed an order yet
  const hasLocationConditions = rules.conditions.some((c) =>
    SUPPORTED_LOCATION_FIELDS.includes(c.field)
  );

  if (hasLocationConditions) {
    const missingLocationCustomerIds = customers
      .filter((c) => !customerLatestLocationMap.has(c.id))
      .map((c) => c.id);

    if (missingLocationCustomerIds.length > 0) {
      const { data: rawAddresses } = await supabase
        .from('customer_addresses')
        .select('customer_id, state, lga, is_default')
        .in('customer_id', missingLocationCustomerIds);

      if (rawAddresses && rawAddresses.length > 0) {
        for (const addr of rawAddresses) {
          if (!customerLatestLocationMap.has(addr.customer_id) || addr.is_default) {
            customerLatestLocationMap.set(addr.customer_id, {
              state: addr.state || null,
              city: addr.lga || null,
            });
          }
        }
      }
    }
  }

  // 4. Resolve product purchases if product conditions exist
  const hasProductConditions = rules.conditions.some((c) =>
    SUPPORTED_PRODUCT_FIELDS.includes(c.field)
  );

  const validTenantProductIds = new Set<string>();
  const customerProductMap = new Map<string, Set<string>>();

  if (hasProductConditions) {
    // Collect all referenced product IDs across rules
    const referencedProductIds = new Set<string>();
    for (const cond of rules.conditions) {
      if (SUPPORTED_PRODUCT_FIELDS.includes(cond.field)) {
        if (typeof cond.value === 'string' && cond.value.trim()) {
          referencedProductIds.add(cond.value.trim());
        } else if (Array.isArray(cond.value)) {
          for (const v of cond.value) {
            if (typeof v === 'string' && v.trim()) {
              referencedProductIds.add(v.trim());
            }
          }
        }
      }
    }

    if (referencedProductIds.size > 0) {
      const { data: tenantProducts, error: prodErr } = await supabase
        .from('products')
        .select('id, name, status')
        .eq('organization_id', organizationId)
        .in('id', Array.from(referencedProductIds));

      if (!prodErr && tenantProducts) {
        for (const p of tenantProducts) {
          validTenantProductIds.add(p.id);
        }
      }
    }

    const validOrderIds = validOrders.map((o) => o.id);
    if (validOrderIds.length > 0) {
      const orderCustomerMap = new Map<string, string>();
      for (const o of validOrders) {
        orderCustomerMap.set(o.id, o.customer_id!);
      }

      const { data: rawOrderItems, error: itemsErr } = await supabase
        .from('order_items')
        .select('order_id, product_id')
        .in('order_id', validOrderIds);

      if (!itemsErr && rawOrderItems) {
        for (const item of rawOrderItems) {
          const custId = orderCustomerMap.get(item.order_id);
          if (custId && item.product_id) {
            let set = customerProductMap.get(custId);
            if (!set) {
              set = new Set<string>();
              customerProductMap.set(custId, set);
            }
            set.add(item.product_id);
          }
        }
      }
    }
  }

  // 5. Evaluate conditions against each customer
  const matchedCustomers: SegmentCustomer[] = [];

  for (const c of customers) {
    const orderStats = customerOrderMap.get(c.id) || {
      order_count: 0,
      total_spent: 0,
      last_order_at: null,
    };
    const location = customerLatestLocationMap.get(c.id) || {
      state: null,
      city: null,
    };
    const purchasedProducts = customerProductMap.get(c.id) || new Set<string>();

    const cohortData: CustomerCohortData = {
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      email_marketing_consent: c.email_marketing_consent,
      whatsapp_marketing_consent: c.whatsapp_marketing_consent,
      created_at: c.created_at,
      order_count: orderStats.order_count,
      total_spent: orderStats.total_spent,
      last_order_at: orderStats.last_order_at,
      shipping_state: location.state,
      shipping_city: location.city,
      purchasedProductIds: purchasedProducts,
    };

    let isMatch = false;

    if (rules.match === 'all') {
      isMatch = rules.conditions.every((cond) =>
        evaluateCondition(cohortData, cond, validTenantProductIds)
      );
    } else {
      isMatch = rules.conditions.some((cond) =>
        evaluateCondition(cohortData, cond, validTenantProductIds)
      );
    }

    if (isMatch) {
      matchedCustomers.push({
        id: c.id,
        email: c.email,
        first_name: c.first_name,
        last_name: c.last_name,
      });
    }
  }

  return matchedCustomers;
}

async function resolveCohort(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  segmentId: string
): Promise<SegmentCustomer[]> {
  if (!organizationId?.trim()) {
    throw new Error('Organization ID is required');
  }
  if (!segmentId?.trim()) {
    throw new Error('Segment ID is required');
  }

  // 1. Fetch and verify segment ownership
  const segment = await getSegmentById(supabase, organizationId, segmentId);
  if (!segment) {
    throw new Error(`Marketing segment ${segmentId} not found for this organization`);
  }

  // 2. Validate rules
  const rules = validateSegmentRules(segment.rules);
  return resolveCohortRules(supabase, organizationId, rules);
}

// ============================================================================
// 3. PUBLIC SEGMENTATION APIS
// ============================================================================

/**
 * Resolves a segment into matching customers, enforcing consent and organization boundaries.
 */
export async function getSegmentCustomers(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  segmentId: string,
  options?: SegmentCustomerOptions
): Promise<SegmentCustomer[]> {
  const cohort = await resolveCohort(supabase, organizationId, segmentId);

  const offset = Math.max(0, options?.offset || 0);
  const limit = options?.limit ? Math.max(1, options.limit) : undefined;

  if (limit !== undefined) {
    return cohort.slice(offset, offset + limit);
  }

  return offset > 0 ? cohort.slice(offset) : cohort;
}

/**
 * Returns the exact current audience count for a segment after applying conditions,
 * organization isolation, and mandatory email marketing consent.
 */
export async function getSegmentCustomerCount(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  segmentId: string
): Promise<number> {
  const cohort = await resolveCohort(supabase, organizationId, segmentId);
  return cohort.length;
}

/**
 * Previews segment matching customers with a safe limit, returning both
 * preview items and the total matching audience size.
 */
export async function previewSegment(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  segmentId: string,
  options?: { limit?: number }
): Promise<SegmentCustomerPreviewResult> {
  const cohort = await resolveCohort(supabase, organizationId, segmentId);
  const limit = Math.max(1, options?.limit || 20);

  return {
    customers: cohort.slice(0, limit),
    total: cohort.length,
  };
}

/**
 * Previews matching customers from in-flight/unsaved segment rules directly.
 */
export async function previewSegmentRules(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  rules: SegmentRules,
  options?: { limit?: number }
): Promise<SegmentCustomerPreviewResult> {
  const cohort = await resolveCohortRules(supabase, organizationId, rules);
  const limit = Math.max(1, options?.limit || 20);

  return {
    customers: cohort.slice(0, limit),
    total: cohort.length,
  };
}
