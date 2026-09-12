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
import { getSegmentById } from './marketing-segment.service';

// ============================================================================
// 1. VALIDATION LAYER
// ============================================================================

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

    if (!isCustomerField && !isPurchaseField) {
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
}

function evaluateCondition(customer: CustomerCohortData, condition: SegmentCondition): boolean {
  const { field, operator, value } = condition;
  const fieldValue = customer[field];

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
          // Compare day or exact time
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

  // 2. Fetch valid orders for the organization (excluding cancelled and refunded)
  const { data: rawOrders, error: orderErr } = await supabase
    .from('orders')
    .select('id, customer_id, total, status, created_at')
    .eq('organization_id', organizationId);

  if (orderErr) {
    throw new Error(`Failed to fetch orders for segmentation: ${orderErr.message}`);
  }

  // Filter out cancelled and refunded orders
  const validOrders = (rawOrders || []).filter(
    (o) => o.customer_id && o.status !== 'cancelled' && o.status !== 'refunded'
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

  // 3. Evaluate conditions against each customer
  const matchedCustomers: SegmentCustomer[] = [];

  for (const c of customers) {
    const orderStats = customerOrderMap.get(c.id) || {
      order_count: 0,
      total_spent: 0,
      last_order_at: null,
    };

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
    };

    let isMatch = false;

    if (rules.match === 'all') {
      isMatch = rules.conditions.every((cond) => evaluateCondition(cohortData, cond));
    } else {
      isMatch = rules.conditions.some((cond) => evaluateCondition(cohortData, cond));
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
