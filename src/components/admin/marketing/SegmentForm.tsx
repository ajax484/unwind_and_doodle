'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  MarketingSegment,
  SegmentField,
  SegmentOperator,
  SegmentRules,
  SegmentCondition,
  SegmentCustomer,
} from '@/types/marketing';
import { getSeedSegmentDefinitions } from '@/services/marketing-segment.service';
import Button from '@/components/Button';
import TextInput from '@/components/TextInput';
import Select, { SelectOption } from '@/components/Select';
import Badge from '@/components/Badge';
import Spinner from '@/components/Spinner';
import Modal from '@/components/Modal';
import { ProductPickerModal, SelectableProduct } from '@/components/admin/ProductPickerModal';
import { MultiProductPickerModal, MultiProductSelection } from '@/components/admin/MultiProductPickerModal';

export interface SegmentFormProps {
  initialSegment?: MarketingSegment | null;
}

interface UiCondition {
  id: string;
  field: SegmentField;
  operator: SegmentOperator;
  value: any;
  valueEnd?: any; // For "between" operator
  error?: string;
}

type FieldType =
  | 'text'
  | 'boolean'
  | 'date'
  | 'numeric'
  | 'product'
  | 'product_multi'
  | 'location_state'
  | 'location_city';

interface FieldConfig {
  value: SegmentField;
  label: string;
  type: FieldType;
}

const FIELD_CONFIGS: FieldConfig[] = [
  { value: 'email', label: 'Customer: Email', type: 'text' },
  { value: 'first_name', label: 'Customer: First name', type: 'text' },
  { value: 'last_name', label: 'Customer: Last name', type: 'text' },
  { value: 'email_marketing_consent', label: 'Customer: Email consent', type: 'boolean' },
  { value: 'whatsapp_marketing_consent', label: 'Customer: WhatsApp consent', type: 'boolean' },
  { value: 'created_at', label: 'Customer: Created at', type: 'date' },
  { value: 'purchased_product', label: 'Product: Purchased product', type: 'product' },
  { value: 'not_purchased_product', label: 'Product: Has not purchased product', type: 'product' },
  { value: 'purchased_any_product', label: 'Product: Purchased any of', type: 'product_multi' },
  { value: 'purchased_all_products', label: 'Product: Purchased all of', type: 'product_multi' },
  { value: 'shipping_state', label: 'Shipping: State / Region', type: 'location_state' },
  { value: 'shipping_city', label: 'Shipping: City / LGA', type: 'location_city' },
  { value: 'last_order_at', label: 'Purchase: Last order date', type: 'date' },
  { value: 'order_count', label: 'Purchase: Order count', type: 'numeric' },
  { value: 'total_spent', label: 'Purchase: Total spent (₦)', type: 'numeric' },
];

const TEXT_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'contains', label: 'contains' },
  { value: 'equals', label: 'is equal to' },
  { value: 'not_equals', label: 'is not equal to' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_null', label: 'is empty' },
  { value: 'is_not_null', label: 'is not empty' },
];

const BOOLEAN_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
];

const DATE_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'after', label: 'is after' },
  { value: 'before', label: 'is before' },
  { value: 'equals', label: 'is on' },
  { value: 'between', label: 'is between' },
  { value: 'is_null', label: 'is not set' },
  { value: 'is_not_null', label: 'is set' },
];

const NUMERIC_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'greater_than', label: 'greater than (>)' },
  { value: 'greater_than_or_equal', label: 'at least (>=)' },
  { value: 'less_than', label: 'less than (<)' },
  { value: 'less_than_or_equal', label: 'at most (<=)' },
  { value: 'equals', label: 'equals (=)' },
  { value: 'not_equals', label: 'does not equal (!=)' },
  { value: 'between', label: 'is between' },
];

const PRODUCT_SINGLE_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'equals', label: 'is' },
];

const PRODUCT_MULTI_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'in', label: 'includes' },
];

const LOCATION_STATE_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'equals', label: 'is equal to' },
  { value: 'not_equals', label: 'is not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'is_null', label: 'is not set' },
  { value: 'is_not_null', label: 'is set' },
];

const LOCATION_CITY_OPERATORS: { value: SegmentOperator; label: string }[] = [
  { value: 'equals', label: 'is equal to' },
  { value: 'not_equals', label: 'is not equal to' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'ends_with', label: 'ends with' },
  { value: 'is_null', label: 'is not set' },
  { value: 'is_not_null', label: 'is set' },
];

export const NIGERIA_STATES = [
  'Lagos', 'Federal Capital Territory (Abuja)', 'Interstate',
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

function getFieldType(field: SegmentField): FieldType {
  const cfg = FIELD_CONFIGS.find((f) => f.value === field);
  return cfg?.type || 'text';
}

function getAvailableOperators(fieldType: FieldType): { value: SegmentOperator; label: string }[] {
  switch (fieldType) {
    case 'boolean':
      return BOOLEAN_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    case 'numeric':
      return NUMERIC_OPERATORS;
    case 'product':
      return PRODUCT_SINGLE_OPERATORS;
    case 'product_multi':
      return PRODUCT_MULTI_OPERATORS;
    case 'location_state':
      return LOCATION_STATE_OPERATORS;
    case 'location_city':
      return LOCATION_CITY_OPERATORS;
    case 'text':
    default:
      return TEXT_OPERATORS;
  }
}

function getDefaultOperator(fieldType: FieldType): SegmentOperator {
  switch (fieldType) {
    case 'boolean':
      return 'equals';
    case 'date':
      return 'after';
    case 'numeric':
      return 'greater_than';
    case 'product':
      return 'equals';
    case 'product_multi':
      return 'in';
    case 'location_state':
    case 'location_city':
      return 'equals';
    case 'text':
    default:
      return 'contains';
  }
}

function getDefaultValue(fieldType: FieldType, operator: SegmentOperator): any {
  if (operator === 'is_null' || operator === 'is_not_null') {
    return undefined;
  }
  if (fieldType === 'boolean') {
    return true;
  }
  if (fieldType === 'numeric') {
    return 0;
  }
  if (fieldType === 'product') {
    return '';
  }
  if (fieldType === 'product_multi') {
    return [];
  }
  if (fieldType === 'location_state') {
    return 'Lagos';
  }
  return '';
}

function parseInitialConditions(rules: any): { match: 'all' | 'any'; conditions: UiCondition[] } {
  if (!rules || typeof rules !== 'object') {
    return {
      match: 'all',
      conditions: [
        {
          id: 'cond-1',
          field: 'order_count',
          operator: 'greater_than',
          value: 0,
        },
      ],
    };
  }

  const match = rules.match === 'any' ? 'any' : 'all';
  const rawConds = Array.isArray(rules.conditions) ? rules.conditions : [];

  if (rawConds.length === 0) {
    return {
      match,
      conditions: [
        {
          id: 'cond-1',
          field: 'order_count',
          operator: 'greater_than',
          value: 0,
        },
      ],
    };
  }

  const conditions: UiCondition[] = rawConds.map((c: any, index: number) => {
    const field: SegmentField = c.field || 'email';
    const operator: SegmentOperator = c.operator || 'contains';
    let val = c.value;
    let valEnd = undefined;

    if (operator === 'between' && Array.isArray(c.value)) {
      val = c.value[0];
      valEnd = c.value[1];
    }

    return {
      id: `cond-${index + 1}-${Date.now()}`,
      field,
      operator,
      value: val,
      valueEnd: valEnd,
    };
  });

  return { match, conditions };
}

export function SegmentForm({ initialSegment }: SegmentFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialSegment?.id);

  // Form State
  const [name, setName] = useState(initialSegment?.name || '');
  const [description, setDescription] = useState(initialSegment?.description || '');
  const [nameError, setNameError] = useState<string | null>(null);

  const parsed = useMemo(() => parseInitialConditions(initialSegment?.rules), [initialSegment]);
  const [matchMode, setMatchMode] = useState<'all' | 'any'>(parsed.match);
  const [conditions, setConditions] = useState<UiCondition[]>(parsed.conditions);

  // Saving State
  const [saving, setSaving] = useState(false);

  // Preview State
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewCustomers, setPreviewCustomers] = useState<SegmentCustomer[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Product Selection Modal States
  const [activePickerConditionId, setActivePickerConditionId] = useState<string | null>(null);
  const [isSinglePickerOpen, setIsSinglePickerOpen] = useState(false);
  const [isMultiPickerOpen, setIsMultiPickerOpen] = useState(false);
  const [productMetadataMap, setProductMetadataMap] = useState<
    Map<string, { name: string; sku: string | null; selling_price?: number; status?: string }>
  >(new Map());

  // Load product catalog metadata for chip displays and unavailable product fallbacks
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        const res = await fetch('/api/admin/products?limit=100');
        const json = await res.json();
        if (isMounted && res.ok && json.success && Array.isArray(json.data?.products)) {
          const map = new Map<string, { name: string; sku: string | null; selling_price?: number; status?: string }>();
          for (const p of json.data.products) {
            map.set(p.id, {
              name: p.name,
              sku: p.sku || null,
              selling_price: p.selling_price,
              status: p.status,
            });
          }
          setProductMetadataMap(map);
        }
      } catch {
        // Non-fatal metadata load
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. Condition Row Mutators
  const handleFieldChange = (id: string, newField: SegmentField) => {
    const fieldType = getFieldType(newField);
    const defaultOp = getDefaultOperator(fieldType);
    const defaultVal = getDefaultValue(fieldType, defaultOp);

    setConditions((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              field: newField,
              operator: defaultOp,
              value: defaultVal,
              valueEnd: undefined,
              error: undefined,
            }
          : c
      )
    );
  };

  const handleOperatorChange = (id: string, newOperator: SegmentOperator) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const fieldType = getFieldType(c.field);
        let val = c.value;
        let valEnd = undefined;

        if (newOperator === 'is_null' || newOperator === 'is_not_null') {
          val = undefined;
        } else if (newOperator === 'between') {
          if (fieldType === 'numeric') {
            val = typeof val === 'number' ? val : 0;
            valEnd = 100;
          } else if (fieldType === 'date') {
            val = typeof val === 'string' ? val : '';
            valEnd = '';
          }
        } else {
          if (val === undefined) {
            val = getDefaultValue(fieldType, newOperator);
          }
        }

        return {
          ...c,
          operator: newOperator,
          value: val,
          valueEnd: valEnd,
          error: undefined,
        };
      })
    );
  };

  const handleValueChange = (id: string, newVal: any) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, value: newVal, error: undefined } : c))
    );
  };

  const handleValueEndChange = (id: string, newValEnd: any) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, valueEnd: newValEnd, error: undefined } : c))
    );
  };

  const handleAddCondition = () => {
    const newId = `cond-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setConditions((prev) => [
      ...prev,
      {
        id: newId,
        field: 'order_count',
        operator: 'greater_than',
        value: 0,
      },
    ]);
  };

  const handleRemoveCondition = (id: string) => {
    if (conditions.length <= 1) {
      toast.info('A segment must contain at least one condition.');
      return;
    }
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleApplyTemplate = (templateName: string) => {
    const templates = getSeedSegmentDefinitions();
    const found = templates.find((t) => t.name === templateName);
    if (!found) return;

    setName(found.name);
    setDescription(found.description);
    setNameError(null);
    const parsedTpl = parseInitialConditions(found.rules);
    setMatchMode(parsedTpl.match);
    setConditions(parsedTpl.conditions);
    toast.info(`Applied template "${found.name}"`);
  };

  // 2. Validate Conditions into clean SegmentRules
  const buildValidatedRules = useCallback((): { rules: SegmentRules | null; errors: string[] } => {
    const errors: string[] = [];
    const validConditions: SegmentCondition[] = [];

    if (conditions.length === 0) {
      errors.push('At least one condition is required.');
      return { rules: null, errors };
    }

    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      const fieldType = getFieldType(c.field);
      const isNullOp = c.operator === 'is_null' || c.operator === 'is_not_null';

      if (isNullOp) {
        validConditions.push({
          field: c.field,
          operator: c.operator,
        });
        continue;
      }

      if (c.operator === 'between') {
        if (fieldType === 'numeric') {
          const min = Number(c.value);
          const max = Number(c.valueEnd);
          if (c.value === '' || c.value === null || c.value === undefined || Number.isNaN(min)) {
            errors.push(`Condition #${i + 1}: Minimum value is required.`);
            continue;
          }
          if (c.valueEnd === '' || c.valueEnd === null || c.valueEnd === undefined || Number.isNaN(max)) {
            errors.push(`Condition #${i + 1}: Maximum value is required.`);
            continue;
          }
          if (min > max) {
            errors.push(`Condition #${i + 1}: Minimum value cannot exceed maximum value.`);
            continue;
          }
          validConditions.push({
            field: c.field,
            operator: c.operator,
            value: [min, max],
          });
        } else if (fieldType === 'date') {
          if (!c.value || typeof c.value !== 'string' || !c.value.trim()) {
            errors.push(`Condition #${i + 1}: Start date is required.`);
            continue;
          }
          if (!c.valueEnd || typeof c.valueEnd !== 'string' || !c.valueEnd.trim()) {
            errors.push(`Condition #${i + 1}: End date is required.`);
            continue;
          }
          if (new Date(c.value).getTime() > new Date(c.valueEnd).getTime()) {
            errors.push(`Condition #${i + 1}: Start date cannot be after end date.`);
            continue;
          }
          validConditions.push({
            field: c.field,
            operator: c.operator,
            value: [c.value, c.valueEnd],
          });
        }
        continue;
      }

      // Standard operators
      if (fieldType === 'boolean') {
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: Boolean(c.value),
        });
      } else if (fieldType === 'numeric') {
        const num = Number(c.value);
        if (c.value === '' || c.value === null || c.value === undefined || Number.isNaN(num)) {
          errors.push(`Condition #${i + 1}: A valid number is required.`);
          continue;
        }
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: num,
        });
      } else if (fieldType === 'date') {
        if (!c.value || typeof c.value !== 'string' || !c.value.trim()) {
          errors.push(`Condition #${i + 1}: A valid date is required.`);
          continue;
        }
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: c.value.trim(),
        });
      } else if (fieldType === 'product') {
        if (typeof c.value !== 'string' || !c.value.trim()) {
          errors.push(`Condition #${i + 1}: Please select a product.`);
          continue;
        }
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: c.value.trim(),
        });
      } else if (fieldType === 'product_multi') {
        if (!Array.isArray(c.value) || c.value.length === 0) {
          errors.push(`Condition #${i + 1}: Please select at least one product.`);
          continue;
        }
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: c.value,
        });
      } else if (fieldType === 'location_state' || fieldType === 'location_city') {
        if (c.operator === 'in') {
          if (!Array.isArray(c.value) || c.value.length === 0) {
            errors.push(`Condition #${i + 1}: Please enter at least one location.`);
            continue;
          }
          validConditions.push({
            field: c.field,
            operator: c.operator,
            value: c.value,
          });
        } else {
          if (typeof c.value !== 'string' || !c.value.trim()) {
            errors.push(`Condition #${i + 1}: Location value cannot be empty.`);
            continue;
          }
          validConditions.push({
            field: c.field,
            operator: c.operator,
            value: c.value.trim(),
          });
        }
      } else {
        // text
        if (typeof c.value !== 'string' || !c.value.trim()) {
          errors.push(`Condition #${i + 1}: Text value cannot be empty.`);
          continue;
        }
        validConditions.push({
          field: c.field,
          operator: c.operator,
          value: c.value.trim(),
        });
      }
    }

    if (errors.length > 0 || validConditions.length !== conditions.length) {
      return { rules: null, errors };
    }

    return {
      rules: {
        match: matchMode,
        conditions: validConditions,
      },
      errors: [],
    };
  }, [conditions, matchMode]);

  // 3. Debounced Server Preview
  const runPreview = useCallback(async () => {
    const { rules, errors } = buildValidatedRules();
    if (!rules || errors.length > 0) {
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    try {
      setPreviewLoading(true);
      setPreviewError(null);

      const res = await fetch('/api/admin/marketing/segments/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules, limit: 10 }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to calculate audience preview');
      }

      setPreviewCount(json.count);
      setPreviewCustomers(json.customers || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error previewing audience';
      setPreviewError(msg);
      setPreviewCount(null);
      setPreviewCustomers([]);
    } finally {
      setPreviewLoading(false);
    }
  }, [buildValidatedRules]);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      runPreview();
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [conditions, matchMode, runPreview]);

  // 4. Save Handler
  const handleSaveSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setNameError('Segment name is required.');
      return;
    }
    if (cleanName.length > 100) {
      setNameError('Segment name cannot exceed 100 characters.');
      return;
    }

    const { rules, errors } = buildValidatedRules();
    if (!rules || errors.length > 0) {
      toast.error(errors[0] || 'Please resolve all condition errors before saving.');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: cleanName,
        description: description.trim() || null,
        rules,
      };

      const url = isEditing
        ? `/api/admin/marketing/segments/${initialSegment!.id}`
        : '/api/admin/marketing/segments';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save marketing segment');
      }

      toast.success(isEditing ? 'Segment updated successfully!' : 'Segment created successfully!');
      router.push(`/admin/marketing/segments/${json.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex flex-col gap-1">
          <Link
            href="/admin/marketing/segments"
            className="text-xs font-semibold text-action-primary hover:underline flex items-center gap-1 w-fit"
          >
            ← Back to Segments
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-heading text-text-primary">
              {isEditing ? `Edit Segment: ${initialSegment?.name}` : 'Create Segment'}
            </h1>
            {isEditing && (
              <Badge variant="status" statusType="neutral" size="sm">
                ID: {initialSegment?.id.slice(0, 8)}...
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/marketing/segments">
            <Button variant="outline" size="sm" type="button" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={handleSaveSegment}
            disabled={saving}
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Saving...</span>
              </div>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Save Segment'
            )}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSaveSegment} className="space-y-8">
        {/* Optional Starter Templates (When creating new segment) */}
        {!isEditing && (
          <div className="bg-bg-surface p-6 rounded-2xl border border-border-default shadow-xs space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h3 className="text-sm font-bold font-heading text-text-primary flex items-center gap-2">
                  <span>🌱</span>
                  <span>Start from a Recommended Template</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Pick a standard audience segment preset below to autofill rules, or build your custom conditions from scratch.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {getSeedSegmentDefinitions().map((tmpl) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.name)}
                  className={`px-3 py-2 text-xs rounded-xl font-medium border transition-all ${
                    name === tmpl.name
                      ? 'bg-status-blue-bg border-status-blue-accent text-status-blue-text font-semibold shadow-xs'
                      : 'bg-bg-subtle border-border-input text-text-secondary hover:text-text-primary hover:border-border-brand hover:bg-bg-surface'
                  }`}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div className="bg-bg-surface p-6 rounded-2xl border border-border-default shadow-xs space-y-4">
          <h2 className="text-base font-bold font-heading text-text-primary">
            1. Segment Details
          </h2>

          <div className="grid grid-cols-1 gap-4 max-w-2xl">
            <div>
              <TextInput
                label={
                  <span>
                    Segment Name <span className="text-status-danger-accent">*</span>
                  </span>
                }
                id="segment-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                placeholder="e.g. High Spenders, Newsletter Subscribers"
                errorMessage={nameError}
                maxLength={100}
                required
              />
            </div>

            <div>
              <TextInput
                label="Description (Optional)"
                id="segment-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what audience this segment targets"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Rule Builder */}
        <div className="bg-bg-surface p-6 rounded-2xl border border-border-default shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-default pb-4">
            <div>
              <h2 className="text-base font-bold font-heading text-text-primary">
                2. Who should be included?
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Define the dynamic criteria customers must meet to join this segment.
              </p>
            </div>

            {/* Match Mode Controls */}
            <div className="flex items-center gap-2 bg-bg-subtle p-1 rounded-xl border border-border-default w-fit">
              <button
                type="button"
                onClick={() => setMatchMode('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  matchMode === 'all'
                    ? 'bg-bg-surface text-action-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All conditions (AND)
              </button>
              <button
                type="button"
                onClick={() => setMatchMode('any')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  matchMode === 'any'
                    ? 'bg-bg-surface text-action-primary shadow-xs font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Any condition (OR)
              </button>
            </div>
          </div>

          {/* Condition Rows List */}
          <div className="space-y-3">
            {conditions.map((condition, idx) => {
              const fieldType = getFieldType(condition.field);
              const availableOps = getAvailableOperators(fieldType);
              const isNullOp = condition.operator === 'is_null' || condition.operator === 'is_not_null';
              const isBetween = condition.operator === 'between';

              return (
                <div
                  key={condition.id}
                  className="flex flex-col md:flex-row md:items-center gap-2.5 p-3.5 rounded-xl bg-bg-subtle border border-border-default transition-all"
                >
                  <span className="text-xs font-semibold text-text-tertiary w-6 shrink-0 hidden md:inline">
                    #{idx + 1}
                  </span>

                  {/* Field Selector */}
                  <div className="w-full md:w-56 shrink-0">
                    <label className="sr-only" htmlFor={`field-${condition.id}`}>
                      Field
                    </label>
                    <Select
                      id={`field-${condition.id}`}
                      size="sm"
                      value={condition.field}
                      onChange={(e) =>
                        handleFieldChange(condition.id, e.target.value as SegmentField)
                      }
                      options={FIELD_CONFIGS.map((f) => ({
                        value: f.value,
                        label: f.label,
                      }))}
                    />
                  </div>

                  {/* Operator Selector */}
                  <div className="w-full md:w-48 shrink-0">
                    <label className="sr-only" htmlFor={`operator-${condition.id}`}>
                      Operator
                    </label>
                    <Select
                      id={`operator-${condition.id}`}
                      size="sm"
                      value={condition.operator}
                      onChange={(e) =>
                        handleOperatorChange(condition.id, e.target.value as SegmentOperator)
                      }
                      options={availableOps.map((op) => ({
                        value: op.value,
                        label: op.label,
                      }))}
                    />
                  </div>

                  {/* Value Input (Dynamic based on field type and operator) */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {isNullOp ? (
                      <div className="text-xs text-text-tertiary italic px-2 py-1.5 bg-bg-surface/60 rounded-lg border border-border-default/50 w-full">
                        No value required
                      </div>
                    ) : isBetween ? (
                      <div className="flex items-center gap-2 w-full">
                        {fieldType === 'date' ? (
                          <>
                            <input
                              type="date"
                              id={`val-start-${condition.id}`}
                              value={condition.value || ''}
                              onChange={(e) => handleValueChange(condition.id, e.target.value)}
                              className="h-8 px-2 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                              required
                            />
                            <span className="text-xs text-text-tertiary font-medium">and</span>
                            <input
                              type="date"
                              id={`val-end-${condition.id}`}
                              value={condition.valueEnd || ''}
                              onChange={(e) => handleValueEndChange(condition.id, e.target.value)}
                              className="h-8 px-2 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                              required
                            />
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              id={`val-min-${condition.id}`}
                              value={condition.value ?? ''}
                              onChange={(e) =>
                                handleValueChange(
                                  condition.id,
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              placeholder="Min"
                              className="h-8 px-2.5 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                              required
                            />
                            <span className="text-xs text-text-tertiary font-medium">and</span>
                            <input
                              type="number"
                              id={`val-max-${condition.id}`}
                              value={condition.valueEnd ?? ''}
                              onChange={(e) =>
                                handleValueEndChange(
                                  condition.id,
                                  e.target.value === '' ? '' : Number(e.target.value)
                                )
                              }
                              placeholder="Max"
                              className="h-8 px-2.5 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                              required
                            />
                          </>
                        )}
                      </div>
                    ) : fieldType === 'boolean' ? (
                      <div className="w-full">
                        <label className="sr-only" htmlFor={`bool-${condition.id}`}>
                          Boolean Value
                        </label>
                        <Select
                          id={`bool-${condition.id}`}
                          size="sm"
                          value={String(condition.value)}
                          onChange={(e) =>
                            handleValueChange(condition.id, e.target.value === 'true')
                          }
                          options={[
                            { value: 'true', label: 'Yes' },
                            { value: 'false', label: 'No' },
                          ]}
                        />
                      </div>
                    ) : fieldType === 'date' ? (
                      <input
                        type="date"
                        id={`date-${condition.id}`}
                        value={condition.value || ''}
                        onChange={(e) => handleValueChange(condition.id, e.target.value)}
                        className="h-8 px-2 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                        required
                      />
                    ) : fieldType === 'numeric' ? (
                      <input
                        type="number"
                        id={`num-${condition.id}`}
                        value={condition.value ?? ''}
                        onChange={(e) =>
                          handleValueChange(
                            condition.id,
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                        placeholder="e.g. 1"
                        className="h-8 px-2.5 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                        required
                      />
                    ) : fieldType === 'product' ? (
                      <div className="flex items-center gap-2 w-full">
                        {condition.value ? (
                          <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-bg-surface border border-border-default text-xs w-full">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-semibold text-text-primary truncate">
                                {productMetadataMap.get(condition.value)?.name || (
                                  <span className="text-status-warning-text flex items-center gap-1">
                                    ⚠️ Unavailable Product ({String(condition.value).slice(0, 8)}...)
                                  </span>
                                )}
                              </span>
                              {productMetadataMap.get(condition.value)?.sku && (
                                <Badge variant="tag" size="sm">
                                  SKU: {productMetadataMap.get(condition.value)?.sku}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePickerConditionId(condition.id);
                                  setIsSinglePickerOpen(true);
                                }}
                                className="text-xs font-semibold text-action-primary hover:underline cursor-pointer"
                              >
                                Change
                              </button>
                              <button
                                type="button"
                                onClick={() => handleValueChange(condition.id, '')}
                                className="text-xs text-text-tertiary hover:text-status-danger-accent cursor-pointer"
                                title="Clear product"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setActivePickerConditionId(condition.id);
                              setIsSinglePickerOpen(true);
                            }}
                            className="w-full justify-center text-xs"
                          >
                            📦 Choose Product...
                          </Button>
                        )}
                      </div>
                    ) : fieldType === 'product_multi' ? (
                      <div className="flex flex-col gap-2 w-full">
                        {Array.isArray(condition.value) && condition.value.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 items-center p-2 rounded-xl bg-bg-surface border border-border-default min-h-9">
                            {condition.value.map((pid: string) => {
                              const info = productMetadataMap.get(pid);
                              return (
                                <span
                                  key={pid}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-bg-subtle text-xs font-medium text-text-primary border border-border-default"
                                >
                                  <span>{info?.name || `Product (${pid.slice(0, 8)}...)`}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextVal = condition.value.filter((id: string) => id !== pid);
                                      handleValueChange(condition.id, nextVal);
                                    }}
                                    className="text-text-tertiary hover:text-status-danger-accent cursor-pointer text-xs"
                                    title="Remove product"
                                  >
                                    ✕
                                  </button>
                                </span>
                              );
                            })}
                            <Button
                              variant="ghost"
                              size="sm"
                              type="button"
                              onClick={() => {
                                setActivePickerConditionId(condition.id);
                                setIsMultiPickerOpen(true);
                              }}
                              className="text-xs py-0.5 px-2"
                            >
                              + Edit Products ({condition.value.length})
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => {
                              setActivePickerConditionId(condition.id);
                              setIsMultiPickerOpen(true);
                            }}
                            className="w-full justify-center text-xs"
                          >
                            📦 Choose Products...
                          </Button>
                        )}
                      </div>
                    ) : fieldType === 'location_state' ? (
                      <div className="w-full">
                        <Select
                          id={`state-${condition.id}`}
                          size="sm"
                          value={condition.value || 'Lagos'}
                          onChange={(e) => handleValueChange(condition.id, e.target.value)}
                          options={NIGERIA_STATES.map((st) => ({
                            value: st,
                            label: st,
                          }))}
                        />
                      </div>
                    ) : fieldType === 'location_city' ? (
                      <input
                        type="text"
                        id={`city-${condition.id}`}
                        value={condition.value ?? ''}
                        onChange={(e) => handleValueChange(condition.id, e.target.value)}
                        placeholder="e.g. Ikeja, Lekki, Abuja, Port Harcourt..."
                        className="h-8 px-2.5 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        id={`text-${condition.id}`}
                        value={condition.value ?? ''}
                        onChange={(e) => handleValueChange(condition.id, e.target.value)}
                        placeholder="Value..."
                        className="h-8 px-2.5 text-xs rounded-xl bg-bg-surface border border-border-input text-text-primary w-full focus:ring-2 focus:ring-border-brand focus:border-border-brand"
                        required
                      />
                    )}
                  </div>

                  {/* Remove Button */}
                  <div className="shrink-0 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(condition.id)}
                      disabled={conditions.length <= 1}
                      className="p-1.5 text-text-tertiary hover:text-status-danger-accent disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-bg-surface cursor-pointer transition-colors"
                      title="Remove condition"
                      aria-label={`Remove condition ${idx + 1}`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Condition Button */}
          <div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleAddCondition}
              className="gap-1.5"
            >
              <span>+ Add condition</span>
            </Button>
          </div>
        </div>

        {/* Section 3: Audience Preview */}
        <div className="bg-bg-surface p-6 rounded-2xl border border-border-default shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold font-heading text-text-primary">
                3. Audience Preview
              </h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                Real-time calculation evaluated using server-side consent &amp; data rules.
              </p>
            </div>

            {previewCount !== null && previewCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                👁️ View Matching Customers
              </Button>
            )}
          </div>

          <div className="p-4 rounded-xl bg-bg-subtle border border-border-default flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {previewLoading ? (
                <div className="flex items-center gap-2 text-text-tertiary text-xs">
                  <Spinner size="sm" />
                  <span>Calculating matching audience...</span>
                </div>
              ) : previewError ? (
                <div className="text-xs text-status-danger-accent font-medium">
                  {previewError}
                </div>
              ) : previewCount !== null ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-heading text-text-primary">
                    {previewCount.toLocaleString()}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    {previewCount === 1 ? 'customer matches' : 'customers match'} these rules
                  </span>
                </div>
              ) : (
                <span className="text-xs text-text-tertiary">
                  Complete condition values to preview audience count.
                </span>
              )}
            </div>

            {/* Email Consent Informational Note */}
            <div className="text-[11px] text-text-tertiary flex items-center gap-1.5 bg-bg-surface px-3 py-1.5 rounded-lg border border-border-default/60">
              <span>🔒</span>
              <span>Only customers who have consented to email marketing can receive campaigns.</span>
            </div>
          </div>
        </div>

        {/* Form Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/marketing/segments">
            <Button variant="outline" size="md" type="button" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="md" type="submit" disabled={saving}>
            {saving ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Saving segment...</span>
              </div>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Save Segment'
            )}
          </Button>
        </div>
      </form>

      {/* Customer Preview Modal */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Matching Audience Preview"
        size="md"
      >
        <div className="space-y-4">
          <div className="text-xs text-text-secondary">
            Showing up to 10 sample customers matching your criteria (total matching:{' '}
            <strong className="text-text-primary">{previewCount?.toLocaleString()}</strong>):
          </div>

          <div className="border border-border-default rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-bg-subtle border-b border-border-default text-text-secondary font-semibold">
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {previewCustomers.length > 0 ? (
                  previewCustomers.map((cust) => {
                    const fullName = [cust.first_name, cust.last_name]
                      .filter(Boolean)
                      .join(' ') || 'Customer';
                    return (
                      <tr key={cust.id} className="hover:bg-bg-subtle/50 transition-colors">
                        <td className="py-2.5 px-3 font-medium text-text-primary">{fullName}</td>
                        <td className="py-2.5 px-3 text-text-secondary">{cust.email}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={2} className="py-6 text-center text-text-tertiary">
                      No matching customers found for this criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => setIsCustomerModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Single Product Picker Modal */}
      {isSinglePickerOpen && (
        <ProductPickerModal
          isOpen={isSinglePickerOpen}
          onClose={() => {
            setIsSinglePickerOpen(false);
            setActivePickerConditionId(null);
          }}
          onSelectProduct={(product: SelectableProduct) => {
            if (activePickerConditionId) {
              handleValueChange(activePickerConditionId, product.id);
              setProductMetadataMap((prev) => {
                const next = new Map(prev);
                next.set(product.id, {
                  name: product.name,
                  sku: product.sku,
                  selling_price: product.selling_price,
                  status: product.status,
                });
                return next;
              });
            }
            setIsSinglePickerOpen(false);
            setActivePickerConditionId(null);
          }}
          selectedProductIds={
            activePickerConditionId
              ? [conditions.find((c) => c.id === activePickerConditionId)?.value].filter(Boolean)
              : []
          }
        />
      )}

      {/* Multi Product Picker Modal */}
      {isMultiPickerOpen && (
        <MultiProductPickerModal
          isOpen={isMultiPickerOpen}
          onClose={() => {
            setIsMultiPickerOpen(false);
            setActivePickerConditionId(null);
          }}
          onAddProducts={(selections: MultiProductSelection[]) => {
            if (activePickerConditionId) {
              const selectedIds = selections.map((s) => s.product.id);
              handleValueChange(activePickerConditionId, selectedIds);
              setProductMetadataMap((prev) => {
                const next = new Map(prev);
                for (const s of selections) {
                  next.set(s.product.id, {
                    name: s.product.name,
                    sku: s.product.sku,
                    selling_price: s.product.selling_price,
                    status: s.product.status,
                  });
                }
                return next;
              });
            }
            setIsMultiPickerOpen(false);
            setActivePickerConditionId(null);
          }}
          alreadySelectedProductIds={
            activePickerConditionId
              ? (conditions.find((c) => c.id === activePickerConditionId)?.value || [])
              : []
          }
        />
      )}
    </div>
  );
}
