import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Json } from '../lib/supabase/types';
import { parseCsvObjects } from '../lib/csv-parser';
import {
  BumpaConsentStatus,
  ProductMappingStatus,
  HistoricalProductSummary,
  ParsedHistoricalCustomer,
  ParsedHistoricalOrder,
  ParsedHistoricalOrderItem,
  ImportPreviewReport,
  ConfirmedProductMappingItem,
  ExecuteImportInput,
  ExecuteImportResult,
  ImportBatchListItem,
} from '../types/historical-import';
import { ORDER_STATUS, PAYMENT_STATUS } from '../lib/constants';

// ============================================================================
// 1. NORMALIZATION & PRECEDENCE HELPERS
// ============================================================================

/**
 * Normalizes email by trimming and lowercasing.
 */
export function normalizeCustomerEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : null;
}

/**
 * Normalizes phone number to clean digits.
 */
export function normalizeCustomerPhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 ? digits : null;
}

/**
 * Normalizes product title for fuzzy matching (lowercased, alphanumeric + spaces only).
 */
export function normalizeProductTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Nigerian States list for automatic state extraction from freeform addresses or shipping options.
 */
export const NIGERIAN_STATES = [
  'Lagos', 'Abuja', 'FCT', 'Rivers', 'Oyo', 'Kano', 'Kaduna', 'Edo', 'Delta', 'Osun',
  'Ondo', 'Ekiti', 'Kogi', 'Plateau', 'Enugu', 'Cross River', 'Akwa Ibom', 'Abia',
  'Bayelsa', 'Benue', 'Borno', 'Kebbi', 'Niger', 'Anambra', 'Imo', 'Kwara', 'Ogun',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'Adamawa', 'Bauchi', 'Ebonyi', 'Gombe', 'Jigawa',
  'Katsina', 'Nasarawa'
];

export const NIGERIAN_DISTRICT_TO_STATE: Record<string, string> = {
  maitama: 'Abuja',
  gwarinpa: 'Abuja',
  wuse: 'Abuja',
  asokoro: 'Abuja',
  garki: 'Abuja',
  jabi: 'Abuja',
  utako: 'Abuja',
  kubwa: 'Abuja',
  lugbe: 'Abuja',
  lifecamp: 'Abuja',
  'life camp': 'Abuja',
  galadimawa: 'Abuja',
  gwagwalada: 'Abuja',
  fct: 'Abuja',
  ikeja: 'Lagos',
  lekki: 'Lagos',
  'victoria island': 'Lagos',
  ikoyi: 'Lagos',
  yaba: 'Lagos',
  surulere: 'Lagos',
  magodo: 'Lagos',
  maryland: 'Lagos',
  ogba: 'Lagos',
  gbagada: 'Lagos',
  ikorodu: 'Lagos',
  festac: 'Lagos',
  sangotedo: 'Lagos',
  oniru: 'Lagos',
  akoka: 'Lagos',
  ketu: 'Lagos',
  alapere: 'Lagos',
  ibadan: 'Oyo',
  'port harcourt': 'Rivers',
  phc: 'Rivers',
  warri: 'Delta',
  asaba: 'Delta',
  benin: 'Edo',
  abeokuta: 'Ogun',
  onitsha: 'Anambra',
  awka: 'Anambra',
  owerri: 'Imo',
  jos: 'Plateau',
  calabar: 'Cross River',
  uyo: 'Akwa Ibom',
  ilorin: 'Kwara',
  akure: 'Ondo',
  osogbo: 'Osun',
  ilesha: 'Osun',
  'ado ekiti': 'Ekiti',
};

/**
 * Extracts a recognized Nigerian state from freeform address or shipping option text.
 */
export function extractStateFromText(text: string | null | undefined): string | null {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();
  for (const st of NIGERIAN_STATES) {
    const regex = new RegExp(`\\b${st.toLowerCase()}\\b`, 'i');
    if (regex.test(lower)) {
      return st === 'FCT' ? 'Abuja' : st;
    }
  }

  for (const [dist, state] of Object.entries(NIGERIAN_DISTRICT_TO_STATE)) {
    const regex = new RegExp(`\\b${dist}\\b`, 'i');
    if (regex.test(lower)) {
      return state;
    }
  }

  return null;
}

/**
 * Extracts clean city and state from freeform address and shipping option strings.
 */
export function extractCityAndState(
  address: string | null | undefined,
  shippingOption?: string | null | undefined
): { city: string; state: string } {
  const recognizedState = extractStateFromText(address) || extractStateFromText(shippingOption) || 'Unknown';

  if (!address || typeof address !== 'string' || !address.trim()) {
    return {
      city: recognizedState !== 'Unknown' ? recognizedState : 'Unknown',
      state: recognizedState,
    };
  }

  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  let city = 'Unknown';

  if (parts.length >= 3) {
    const last = parts[parts.length - 1].toLowerCase();
    if (last === 'nigeria') {
      city = parts[parts.length - 3] || parts[parts.length - 2] || 'Unknown';
    } else {
      city = parts[parts.length - 2] || 'Unknown';
    }
  } else if (parts.length === 2) {
    city = parts[0];
  }

  // If city is too long (> 35 chars) or matches state or is Unknown, fallback cleanly to state
  if (!city || city.length > 35 || city.toLowerCase() === recognizedState.toLowerCase() || city === 'Unknown') {
    city = recognizedState !== 'Unknown' ? recognizedState : 'Unknown';
  }

  return {
    city,
    state: recognizedState,
  };
}

/**
 * Explicit mapping from Bumpa order status and shipping status strings to Unwind & Doodle OrderStatus.
 */
export function mapBumpaOrderStatus(
  statusStr: string | null | undefined,
  shippingStatusStr?: string | null | undefined
): string {
  // If actual shipping fulfillment status is provided, it provides high-fidelity delivery state
  if (shippingStatusStr && typeof shippingStatusStr === 'string') {
    const ship = shippingStatusStr.trim().toLowerCase();
    if (['delivered', 'received', 'picked_up', 'picked up'].includes(ship)) {
      return ORDER_STATUS.RECEIVED;
    }
    if (['shipped', 'in transit', 'out for delivery', 'dispatched'].includes(ship)) {
      return ORDER_STATUS.SHIPPED;
    }
    if (['returned'].includes(ship)) {
      return ORDER_STATUS.REFUNDED;
    }
  }

  if (!statusStr || typeof statusStr !== 'string') return ORDER_STATUS.PENDING;
  const s = statusStr.trim().toLowerCase();

  if (['completed', 'delivered', 'successful', 'received'].includes(s)) {
    return ORDER_STATUS.RECEIVED;
  }
  if (['shipped', 'dispatched', 'in transit', 'out for delivery'].includes(s)) {
    return ORDER_STATUS.SHIPPED;
  }
  if (['confirmed', 'processing', 'paid', 'open', 'ready'].includes(s)) {
    return ORDER_STATUS.CONFIRMED;
  }
  if (['cancelled', 'canceled', 'void', 'abandoned'].includes(s)) {
    return ORDER_STATUS.CANCELLED;
  }
  if (['refunded', 'returned'].includes(s)) {
    return ORDER_STATUS.REFUNDED;
  }
  if (['pending', 'unpaid', 'awaiting payment'].includes(s)) {
    return ORDER_STATUS.PENDING;
  }

  return ORDER_STATUS.PENDING;
}

/**
 * Explicit mapping from Bumpa payment status string to PaymentStatus.
 */
export function mapBumpaPaymentStatus(statusStr: string | null | undefined): string {
  if (!statusStr || typeof statusStr !== 'string') return PAYMENT_STATUS.PENDING;
  const s = statusStr.trim().toLowerCase();

  if (['paid', 'successful', 'completed'].includes(s)) {
    return PAYMENT_STATUS.SUCCESSFUL;
  }
  if (['failed', 'declined', 'cancelled', 'canceled'].includes(s)) {
    return PAYMENT_STATUS.FAILED;
  }
  if (['refunded', 'reversed'].includes(s)) {
    return PAYMENT_STATUS.REFUNDED;
  }

  return PAYMENT_STATUS.PENDING;
}

/**
 * Parses Bumpa marketing consent signal into structured status.
 */
export function parseBumpaConsent(consentVal: string | null | undefined): BumpaConsentStatus {
  if (!consentVal || typeof consentVal !== 'string') return 'unknown';
  const s = consentVal.trim().toLowerCase();

  if (['subscribed', 'opted_in', 'yes', 'true', '1', 'consented'].includes(s)) {
    return 'opted_in';
  }
  if (['unsubscribed', 'opted_out', 'no', 'false', '0', 'revoked'].includes(s)) {
    return 'opted_out';
  }

  return 'unknown';
}

/**
 * Deterministic consent precedence rule:
 * - If customer is existing: existing customer state strictly wins!
 *   (Historical data must never turn an opted-out/unknown customer into opted-in).
 * - If customer is new:
 *   - 'opted_in' -> true
 *   - 'opted_out' -> false
 *   - 'unknown' -> false (Safe default, never manufacture consent).
 */
export function resolveConsentPrecedence(
  existingCustomer: { email_marketing_consent: boolean } | null,
  bumpaConsent: BumpaConsentStatus
): boolean {
  if (existingCustomer) {
    return Boolean(existingCustomer.email_marketing_consent);
  }
  return bumpaConsent === 'opted_in';
}

// ============================================================================
// 2. HEADER DETECTION
// ============================================================================

interface ColumnMapping {
  orderId: string | null;
  orderNumber: string | null;
  customerEmail: string | null;
  customerName: string | null;
  firstName: string | null;
  lastName: string | null;
  customerPhone: string | null;
  orderDate: string | null;
  orderStatus: string | null;
  shippingStatus: string | null;
  paymentStatus: string | null;
  productName: string | null;
  quantity: string | null;
  unitPrice: string | null;
  total: string | null;
  subtotal: string | null;
  shippingFee: string | null;
  shippingOption: string | null;
  shippingState: string | null;
  shippingCity: string | null;
  shippingAddress: string | null;
  consent: string | null;
}

function normalizeHeaderName(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function detectColumns(headers: string[]): ColumnMapping {
  const normMap = new Map<string, string>();
  for (const h of headers) {
    normMap.set(normalizeHeaderName(h), h);
  }

  const findCol = (candidates: string[]): string | null => {
    for (const c of candidates) {
      const norm = normalizeHeaderName(c);
      if (normMap.has(norm)) {
        return normMap.get(norm)!;
      }
    }
    return null;
  };

  return {
    orderId: findCol(['id', 'order id', 'order_id', 'order number', 'order#', 'reference']),
    orderNumber: findCol(['order number', 'order#', 'order id', 'order_id', 'id']),
    customerEmail: findCol(['customer email', 'email', 'customer_email', 'buyer email', 'user email']),
    customerName: findCol(['customer name', 'customer', 'name', 'full name', 'buyer name', 'client name']),
    firstName: findCol(['first name', 'firstname', 'first_name']),
    lastName: findCol(['last name', 'lastname', 'last_name']),
    customerPhone: findCol(['customer phone', 'phone', 'phone number', 'mobile', 'telephone', 'phone_number']),
    orderDate: findCol(['order date', 'date', 'created at', 'created_at', 'order_date', 'timestamp', 'date created']),
    orderStatus: findCol(['order status', 'status', 'order_status']),
    shippingStatus: findCol(['shipping status', 'fulfillment status', 'delivery status']),
    paymentStatus: findCol(['payment status', 'payment', 'payment_status']),
    productName: findCol(['products', 'product name', 'product', 'item name', 'items', 'title', 'product_name', 'item']),
    quantity: findCol(['product quantity', 'product_quantity', 'quantity', 'qty', 'units', 'item quantity']),
    unitPrice: findCol(['unit price', 'price', 'item price', 'amount', 'unit_price', 'rate']),
    total: findCol(['total', 'order total', 'total amount', 'total_amount', 'grand total']),
    subtotal: findCol(['sub total', 'subtotal', 'items total']),
    shippingFee: findCol(['shipping price', 'shipping fee', 'shipping', 'delivery fee', 'shipping_fee', 'delivery']),
    shippingOption: findCol(['shipping option', 'shipping_option', 'delivery option']),
    shippingState: findCol(['shipping state', 'state', 'delivery state', 'shipping_state']),
    shippingCity: findCol(['shipping city', 'city', 'delivery city', 'lga', 'shipping_city']),
    shippingAddress: findCol(['customer address', 'shipping address', 'address', 'delivery address', 'street', 'street address']),
    consent: findCol(['marketing consent', 'consent', 'marketing status', 'email consent', 'subscribed']),
  };
}

// ============================================================================
// 3. PARSE & PREVIEW
// ============================================================================

export async function parseAndValidateBumpaData(
  csvString: string,
  organizationId: string,
  supabase: SupabaseClient<Database>,
  fileName: string = 'import.csv'
): Promise<ImportPreviewReport> {
  const warnings: string[] = [];
  const errors: string[] = [];

  const { headers, rows } = parseCsvObjects(csvString);

  if (rows.length === 0) {
    return {
      fileName,
      totalRows: 0,
      customers: { total: 0, newCount: 0, existingCount: 0, invalidCount: 0 },
      orders: { total: 0, validCount: 0, invalidCount: 0, duplicateCount: 0 },
      products: { totalDistinct: 0, mappedCount: 0, unmappedCount: 0, ambiguousCount: 0, items: [] },
      consent: { optedInCount: 0, optedOutCount: 0, unknownCount: 0 },
      warnings: ['CSV file is empty or contains only headers.'],
      errors: ['No data rows found.'],
      canProceed: false,
    };
  }

  const colMap = detectColumns(headers);

  if (!colMap.orderId && !colMap.customerEmail && !colMap.customerPhone) {
    errors.push('Could not identify required identifier columns (Order ID or Customer Email/Phone).');
  }

  // 1. Fetch current catalog products for organization
  const { data: catalogProducts } = await supabase
    .from('products')
    .select('id, name, status')
    .eq('organization_id', organizationId);

  const catalogExactMap = new Map<string, { id: string; name: string }>();
  const catalogNormMap = new Map<string, { id: string; name: string }[]>();

  for (const p of catalogProducts || []) {
    catalogExactMap.set(p.name.trim().toLowerCase(), { id: p.id, name: p.name });
    const norm = normalizeProductTitle(p.name);
    const existing = catalogNormMap.get(norm) || [];
    existing.push({ id: p.id, name: p.name });
    catalogNormMap.set(norm, existing);
  }

  // 2. Fetch saved historical mappings
  const { data: savedMappings } = await supabase
    .from('historical_product_mappings')
    .select('*')
    .eq('organization_id', organizationId);

  const savedMap = new Map<string, { canonical_product_id: string | null; status: ProductMappingStatus }>();
  for (const sm of savedMappings || []) {
    savedMap.set(sm.normalized_title, {
      canonical_product_id: sm.canonical_product_id,
      status: sm.status as ProductMappingStatus,
    });
  }

  // 3. Process Products & Order Items
  const productOccurrences = new Map<string, number>();
  const customerMap = new Map<string, ParsedHistoricalCustomer>();
  const orderMap = new Map<string, ParsedHistoricalOrder>();
  let duplicateOrdersInFile = 0;
  let invalidRows = 0;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    // Customer resolution
    const email = colMap.customerEmail ? normalizeCustomerEmail(row[colMap.customerEmail]) : null;
    const phone = colMap.customerPhone ? normalizeCustomerPhone(row[colMap.customerPhone]) : null;
    const rawName = colMap.customerName ? row[colMap.customerName]?.trim() : '';
    let firstName = colMap.firstName ? row[colMap.firstName]?.trim() || null : null;
    let lastName = colMap.lastName ? row[colMap.lastName]?.trim() || null : null;

    if (!firstName && rawName) {
      const parts = rawName.split(/\s+/);
      firstName = parts[0] || null;
      if (parts.length > 1) {
        lastName = parts.slice(1).join(' ');
      }
    }

    const consentVal = colMap.consent ? parseBumpaConsent(row[colMap.consent]) : 'unknown';

    // Order resolution
    const rawOrderId = colMap.orderId ? row[colMap.orderId]?.trim() : '';
    const rawOrderNum = colMap.orderNumber ? row[colMap.orderNumber]?.trim() : '';
    const orderId = rawOrderId || rawOrderNum || `imp_ord_${rowIndex + 1}`;
    const orderNumber = rawOrderNum || orderId;

    const customerKey = email || phone;
    if (!customerKey) {
      invalidRows++;
      warnings.push(`Row ${rowIndex + 2}: Missing both email and phone number; row will be skipped.`);
      continue;
    }

    if (!customerMap.has(customerKey)) {
      customerMap.set(customerKey, {
        sourceRecordId: customerKey,
        email,
        phone,
        firstName: firstName || 'Customer',
        lastName: lastName || null,
        consentStatus: consentVal,
        createdAt: null,
        isExisting: false,
      });
    }

    const rawDate = colMap.orderDate ? row[colMap.orderDate]?.trim() : null;
    const orderDate = rawDate && !isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : new Date().toISOString();

    const rawOrderStatus = colMap.orderStatus ? row[colMap.orderStatus]?.trim() : null;
    const rawShippingStatus = colMap.shippingStatus ? row[colMap.shippingStatus]?.trim() : null;
    const orderStatus = mapBumpaOrderStatus(rawOrderStatus, rawShippingStatus);
    const paymentStatus = colMap.paymentStatus ? mapBumpaPaymentStatus(row[colMap.paymentStatus]) : PAYMENT_STATUS.SUCCESSFUL;

    const rawQtyStr = colMap.quantity ? String(row[colMap.quantity] || '').trim() : '1';
    const rawUnitPrice = colMap.unitPrice ? parseFloat(row[colMap.unitPrice]?.replace(/[^0-9.]/g, '')) : 0;
    const unitPrice = isNaN(rawUnitPrice) ? 0 : rawUnitPrice;

    const rawTotal = colMap.total ? parseFloat(row[colMap.total]?.replace(/[^0-9.]/g, '')) : 0;
    const rawSubtotal = colMap.subtotal ? parseFloat(row[colMap.subtotal]?.replace(/[^0-9.]/g, '')) : rawTotal;
    const subtotal = isNaN(rawSubtotal) ? 0 : rawSubtotal;
    const total = isNaN(rawTotal) ? subtotal : rawTotal;

    const rawShipping = colMap.shippingFee ? parseFloat(row[colMap.shippingFee]?.replace(/[^0-9.]/g, '')) : 0;
    const shippingFee = isNaN(rawShipping) ? 0 : rawShipping;

    const rawProd = colMap.productName ? row[colMap.productName]?.trim() : '';

    // In Bumpa exports, multi-product orders can be pipe-separated in a single row:
    // e.g. "Product A | Product B", "1 | 2"
    const titles = rawProd && rawProd.includes('|')
      ? rawProd.split('|').map((s) => s.trim()).filter(Boolean)
      : [rawProd || 'Unspecified Historical Product'];

    const qtyParts = rawQtyStr && rawQtyStr.includes('|')
      ? rawQtyStr.split('|').map((s) => {
          const q = parseFloat(s.trim());
          return isNaN(q) || q <= 0 ? 1 : Math.floor(q);
        })
      : [parseFloat(rawQtyStr) || 1];

    const totalQty = qtyParts.reduce((acc, q) => acc + (isNaN(q) ? 1 : q), 0);
    const distributedUnitPrice = titles.length > 0 && subtotal > 0
      ? Math.round((subtotal / Math.max(1, totalQty)) * 100) / 100
      : unitPrice;

    const rowItems: ParsedHistoricalOrderItem[] = [];
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i];
      const itemQty = qtyParts[i] ?? 1;
      const itemUnitPrice = titles.length === 1 && unitPrice > 0 ? unitPrice : distributedUnitPrice;

      productOccurrences.set(title, (productOccurrences.get(title) || 0) + itemQty);

      rowItems.push({
        historicalTitle: title,
        quantity: itemQty,
        unitPrice: itemUnitPrice,
        total: itemUnitPrice * itemQty,
        mappedProductId: null,
        mappingStatus: 'unmapped',
      });
    }

    const rawAddress = colMap.shippingAddress ? row[colMap.shippingAddress]?.trim() : '';
    const rawCity = colMap.shippingCity ? row[colMap.shippingCity]?.trim() : '';
    const rawShippingOption = colMap.shippingOption ? row[colMap.shippingOption]?.trim() : '';

    const { city: parsedCity, state: parsedState } = extractCityAndState(rawAddress, rawShippingOption);
    const state = (colMap.shippingState && row[colMap.shippingState]?.trim()) || parsedState;
    const city = rawCity || parsedCity;
    const streetAddress = rawAddress || rawShippingOption || 'Historical Bumpa Order';

    if (orderMap.has(orderId)) {
      const existingOrder = orderMap.get(orderId)!;
      existingOrder.items.push(...rowItems);
    } else {
      orderMap.set(orderId, {
        sourceRecordId: orderId,
        orderNumber,
        customerKey,
        orderDate,
        orderStatus,
        paymentStatus,
        subtotal,
        shippingFee,
        total,
        currency: 'NGN',
        shippingAddress: {
          streetAddress,
          city,
          state,
        },
        items: [...rowItems],
      });
    }
  }

  // 4. Match products against catalog
  const productSummaries: HistoricalProductSummary[] = [];
  let mappedProductsCount = 0;
  let unmappedProductsCount = 0;
  let ambiguousProductsCount = 0;

  for (const [title, occurrences] of productOccurrences.entries()) {
    const norm = normalizeProductTitle(title);
    const lower = title.toLowerCase().trim();

    // Check saved mapping first
    if (savedMap.has(norm)) {
      const saved = savedMap.get(norm)!;
      const targetProd = (catalogProducts || []).find((p) => p.id === saved.canonical_product_id);
      productSummaries.push({
        historicalTitle: title,
        normalizedTitle: norm,
        occurrences,
        suggestedProductId: saved.canonical_product_id,
        suggestedProductName: targetProd ? targetProd.name : null,
        confidence: 1.0,
        status: saved.status,
      });
      if (saved.status === 'mapped' && saved.canonical_product_id) mappedProductsCount++;
      else unmappedProductsCount++;
      continue;
    }

    // Check exact catalog match
    if (catalogExactMap.has(lower)) {
      const exact = catalogExactMap.get(lower)!;
      productSummaries.push({
        historicalTitle: title,
        normalizedTitle: norm,
        occurrences,
        suggestedProductId: exact.id,
        suggestedProductName: exact.name,
        confidence: 1.0,
        status: 'mapped',
      });
      mappedProductsCount++;
      continue;
    }

    // Check normalized catalog match
    const normMatches = catalogNormMap.get(norm) || [];
    if (normMatches.length === 1) {
      productSummaries.push({
        historicalTitle: title,
        normalizedTitle: norm,
        occurrences,
        suggestedProductId: normMatches[0].id,
        suggestedProductName: normMatches[0].name,
        confidence: 0.9,
        status: 'mapped',
      });
      mappedProductsCount++;
    } else if (normMatches.length > 1) {
      productSummaries.push({
        historicalTitle: title,
        normalizedTitle: norm,
        occurrences,
        suggestedProductId: null,
        suggestedProductName: null,
        confidence: 0.5,
        status: 'unmapped',
        potentialMatches: normMatches,
      });
      ambiguousProductsCount++;
    } else {
      // Substring / prefix matching against catalog products
      const partialMatches: Array<{ id: string; name: string }> = [];
      for (const p of catalogProducts || []) {
        const pNorm = normalizeProductTitle(p.name);
        if (!pNorm || pNorm.length < 3) continue;
        if (norm.startsWith(pNorm) || norm.includes(pNorm) || pNorm.includes(norm)) {
          if (!partialMatches.some((m) => m.id === p.id)) {
            partialMatches.push({ id: p.id, name: p.name });
          }
        }
      }

      if (partialMatches.length === 1) {
        productSummaries.push({
          historicalTitle: title,
          normalizedTitle: norm,
          occurrences,
          suggestedProductId: partialMatches[0].id,
          suggestedProductName: partialMatches[0].name,
          confidence: 0.8,
          status: 'mapped',
          potentialMatches: partialMatches,
        });
        mappedProductsCount++;
      } else if (partialMatches.length > 1) {
        const prefixMatch = partialMatches.find((pm) => norm.startsWith(normalizeProductTitle(pm.name)));
        productSummaries.push({
          historicalTitle: title,
          normalizedTitle: norm,
          occurrences,
          suggestedProductId: prefixMatch ? prefixMatch.id : null,
          suggestedProductName: prefixMatch ? prefixMatch.name : null,
          confidence: prefixMatch ? 0.75 : 0.5,
          status: prefixMatch ? 'mapped' : 'unmapped',
          potentialMatches: partialMatches,
        });
        if (prefixMatch) mappedProductsCount++;
        else ambiguousProductsCount++;
      } else {
        // Unmapped product
        productSummaries.push({
          historicalTitle: title,
          normalizedTitle: norm,
          occurrences,
          suggestedProductId: null,
          suggestedProductName: null,
          confidence: 0.0,
          status: 'unmapped',
        });
        unmappedProductsCount++;
      }
    }
  }

  // 5. Query existing customers from DB
  const emailsToCheck = Array.from(customerMap.values())
    .map((c) => c.email)
    .filter(Boolean) as string[];

  let existingCustomersCount = 0;
  let newCustomersCount = 0;

  if (emailsToCheck.length > 0) {
    const { data: dbCustomers } = await supabase
      .from('customers')
      .select('id, email, email_marketing_consent, first_name, last_name, phone')
      .eq('organization_id', organizationId)
      .in('email', emailsToCheck);

    const existingEmailMap = new Map<string, string>();
    for (const c of dbCustomers || []) {
      existingEmailMap.set(c.email.toLowerCase(), c.id);
    }

    for (const [key, cust] of customerMap.entries()) {
      if (cust.email && existingEmailMap.has(cust.email.toLowerCase())) {
        cust.isExisting = true;
        existingCustomersCount++;
      } else {
        cust.isExisting = false;
        newCustomersCount++;
      }
    }
  } else {
    newCustomersCount = customerMap.size;
  }

  // 6. Check existing orders for idempotency warning
  const orderIdsToCheck = Array.from(orderMap.keys());
  let duplicateOrdersCount = 0;

  if (orderIdsToCheck.length > 0) {
    const { data: dbOrders } = await supabase
      .from('orders')
      .select('id, source_record_id')
      .eq('organization_id', organizationId)
      .eq('source_system', 'bumpa')
      .in('source_record_id', orderIdsToCheck);

    duplicateOrdersCount = (dbOrders || []).length;
  }

  if (duplicateOrdersCount > 0) {
    warnings.push(
      `${duplicateOrdersCount} order(s) already exist in your store from a prior import. Re-running will update them safely without duplicating records.`
    );
  }

  // 7. Consent breakdown
  let optedInCount = 0;
  let optedOutCount = 0;
  let unknownCount = 0;

  for (const c of customerMap.values()) {
    if (c.consentStatus === 'opted_in') optedInCount++;
    else if (c.consentStatus === 'opted_out') optedOutCount++;
    else unknownCount++;
  }

  const report: ImportPreviewReport = {
    fileName,
    totalRows: rows.length,
    customers: {
      total: customerMap.size,
      newCount: newCustomersCount,
      existingCount: existingCustomersCount,
      invalidCount: invalidRows,
    },
    orders: {
      total: orderMap.size,
      validCount: orderMap.size,
      invalidCount: invalidRows,
      duplicateCount: duplicateOrdersCount,
    },
    products: {
      totalDistinct: productSummaries.length,
      mappedCount: mappedProductsCount,
      unmappedCount: unmappedProductsCount,
      ambiguousCount: ambiguousProductsCount,
      items: productSummaries,
    },
    consent: {
      optedInCount,
      optedOutCount,
      unknownCount,
    },
    warnings,
    errors,
    canProceed: errors.length === 0,
    catalogProducts: (catalogProducts || []).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    })),
  };

  return report;
}

// ============================================================================
// 4. EXECUTE IMPORT
// ============================================================================

export interface ExecuteImportContext {
  organizationId: string;
  adminUserId: string;
}

export async function executeHistoricalImport(
  supabase: SupabaseClient<Database>,
  input: ExecuteImportInput,
  context: ExecuteImportContext
): Promise<ExecuteImportResult> {
  const startTime = Date.now();
  const { organizationId, adminUserId } = context;
  const { fileName, csvContent, confirmedProductMappings } = input;

  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Create import batch record in DB
  const { data: batch, error: batchErr } = await supabase
    .from('import_batches')
    .insert({
      organization_id: organizationId,
      source_system: 'bumpa',
      status: 'importing',
      file_name: fileName,
      total_rows: 0,
      created_by: adminUserId,
      product_mappings: confirmedProductMappings as unknown as Json,
    })
    .select('id')
    .single();

  if (batchErr || !batch) {
    throw new Error(`Failed to create import batch record: ${batchErr?.message || 'Database error'}`);
  }

  const batchId = batch.id;

  try {
    // 2. Persist confirmed product mappings into historical_product_mappings
    for (const [normTitle, item] of Object.entries(confirmedProductMappings)) {
      await supabase
        .from('historical_product_mappings')
        .upsert(
          {
            organization_id: organizationId,
            source_system: 'bumpa',
            historical_title: normTitle,
            normalized_title: normTitle,
            canonical_product_id: item.targetProductId || null,
            status: item.status,
            confidence: 1.0,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'organization_id, source_system, normalized_title' }
        );
    }

    // 3. Parse CSV rows
    const { headers, rows } = parseCsvObjects(csvContent);
    const colMap = detectColumns(headers);

    let importedCustomersCount = 0;
    let updatedCustomersCount = 0;
    let importedOrdersCount = 0;
    let skippedOrdersCount = 0;
    let importedItemsCount = 0;

    // 4. Group rows by customer & order
    const customerMap = new Map<string, ParsedHistoricalCustomer>();
    const orderMap = new Map<string, ParsedHistoricalOrder>();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];

      const email = colMap.customerEmail ? normalizeCustomerEmail(row[colMap.customerEmail]) : null;
      const phone = colMap.customerPhone ? normalizeCustomerPhone(row[colMap.customerPhone]) : null;
      const rawName = colMap.customerName ? row[colMap.customerName]?.trim() : '';
      let firstName = colMap.firstName ? row[colMap.firstName]?.trim() || null : null;
      let lastName = colMap.lastName ? row[colMap.lastName]?.trim() || null : null;

      if (!firstName && rawName) {
        const parts = rawName.split(/\s+/);
        firstName = parts[0] || null;
        if (parts.length > 1) {
          lastName = parts.slice(1).join(' ');
        }
      }

      const consentVal = colMap.consent ? parseBumpaConsent(row[colMap.consent]) : 'unknown';

      const rawOrderId = colMap.orderId ? row[colMap.orderId]?.trim() : '';
      const rawOrderNum = colMap.orderNumber ? row[colMap.orderNumber]?.trim() : '';
      const orderId = rawOrderId || rawOrderNum || `imp_ord_${rowIndex + 1}`;
      const orderNumber = rawOrderNum || orderId;

      const customerKey = email || phone;
      if (!customerKey) continue;

      const rawDate = colMap.orderDate ? row[colMap.orderDate]?.trim() : null;
      const orderDate = rawDate && !isNaN(Date.parse(rawDate)) ? new Date(rawDate).toISOString() : new Date().toISOString();

      if (!customerMap.has(customerKey)) {
        customerMap.set(customerKey, {
          sourceRecordId: customerKey,
          email,
          phone,
          firstName: firstName || 'Customer',
          lastName: lastName || null,
          consentStatus: consentVal,
          createdAt: orderDate,
          isExisting: false,
        });
      } else {
        const c = customerMap.get(customerKey)!;
        if (!c.createdAt || new Date(orderDate).getTime() < new Date(c.createdAt).getTime()) {
          c.createdAt = orderDate;
        }
      }

      const rawOrderStatus = colMap.orderStatus ? row[colMap.orderStatus]?.trim() : null;
      const rawShippingStatus = colMap.shippingStatus ? row[colMap.shippingStatus]?.trim() : null;
      const orderStatus = mapBumpaOrderStatus(rawOrderStatus, rawShippingStatus);
      const paymentStatus = colMap.paymentStatus ? mapBumpaPaymentStatus(row[colMap.paymentStatus]) : PAYMENT_STATUS.SUCCESSFUL;

      const rawQtyStr = colMap.quantity ? String(row[colMap.quantity] || '').trim() : '1';
      const rawUnitPrice = colMap.unitPrice ? parseFloat(row[colMap.unitPrice]?.replace(/[^0-9.]/g, '')) : 0;
      const unitPrice = isNaN(rawUnitPrice) ? 0 : rawUnitPrice;

      const rawTotal = colMap.total ? parseFloat(row[colMap.total]?.replace(/[^0-9.]/g, '')) : 0;
      const rawSubtotal = colMap.subtotal ? parseFloat(row[colMap.subtotal]?.replace(/[^0-9.]/g, '')) : rawTotal;
      const subtotal = isNaN(rawSubtotal) ? 0 : rawSubtotal;
      const total = isNaN(rawTotal) ? subtotal : rawTotal;

      const rawShipping = colMap.shippingFee ? parseFloat(row[colMap.shippingFee]?.replace(/[^0-9.]/g, '')) : 0;
      const shippingFee = isNaN(rawShipping) ? 0 : rawShipping;

      const rawProd = colMap.productName ? row[colMap.productName]?.trim() : '';

      const titles = rawProd && rawProd.includes('|')
        ? rawProd.split('|').map((s) => s.trim()).filter(Boolean)
        : [rawProd || 'Unspecified Historical Product'];

      const qtyParts = rawQtyStr && rawQtyStr.includes('|')
        ? rawQtyStr.split('|').map((s) => {
            const q = parseFloat(s.trim());
            return isNaN(q) || q <= 0 ? 1 : Math.floor(q);
          })
        : [parseFloat(rawQtyStr) || 1];

      const totalQty = qtyParts.reduce((acc, q) => acc + (isNaN(q) ? 1 : q), 0);
      const distributedUnitPrice = titles.length > 0 && subtotal > 0
        ? Math.round((subtotal / Math.max(1, totalQty)) * 100) / 100
        : unitPrice;

      const rowItems: ParsedHistoricalOrderItem[] = [];
      for (let i = 0; i < titles.length; i++) {
        const title = titles[i];
        const itemQty = qtyParts[i] ?? 1;
        const itemUnitPrice = titles.length === 1 && unitPrice > 0 ? unitPrice : distributedUnitPrice;
        const normTitle = normalizeProductTitle(title);

        const mappingChoice = confirmedProductMappings[normTitle] || {
          targetProductId: null,
          status: 'unmapped' as ProductMappingStatus,
        };

        rowItems.push({
          historicalTitle: title,
          quantity: itemQty,
          unitPrice: itemUnitPrice,
          total: itemUnitPrice * itemQty,
          mappedProductId: mappingChoice.status === 'mapped' ? mappingChoice.targetProductId : null,
          mappingStatus: mappingChoice.status,
        });
      }

      const rawAddress = colMap.shippingAddress ? row[colMap.shippingAddress]?.trim() : '';
      const rawCity = colMap.shippingCity ? row[colMap.shippingCity]?.trim() : '';
      const rawShippingOption = colMap.shippingOption ? row[colMap.shippingOption]?.trim() : '';

      const { city: parsedCity, state: parsedState } = extractCityAndState(rawAddress, rawShippingOption);
      const state = (colMap.shippingState && row[colMap.shippingState]?.trim()) || parsedState;
      const city = rawCity || parsedCity;
      const streetAddress = rawAddress || rawShippingOption || 'Historical Bumpa Order';

      if (orderMap.has(orderId)) {
        orderMap.get(orderId)!.items.push(...rowItems);
      } else {
        orderMap.set(orderId, {
          sourceRecordId: orderId,
          orderNumber,
          customerKey,
          orderDate,
          orderStatus,
          paymentStatus,
          subtotal,
          shippingFee,
          total,
          currency: 'NGN',
          shippingAddress: {
            streetAddress,
            city,
            state,
          },
          items: [...rowItems],
        });
      }
    }

    // 5. Reconcile Customers (Batched)
    const customerIdMap = new Map<string, string>(); // customerKey -> customer.id in DB

    for (const [key, cust] of customerMap.entries()) {
      let existingCust: {
        id: string;
        email: string;
        phone: string | null;
        first_name: string | null;
        last_name: string | null;
        email_marketing_consent: boolean;
      } | null = null;

      if (cust.email) {
        const { data } = await supabase
          .from('customers')
          .select('id, email, phone, first_name, last_name, email_marketing_consent')
          .eq('organization_id', organizationId)
          .ilike('email', cust.email)
          .maybeSingle();
        existingCust = data;
      }

      if (!existingCust && cust.phone) {
        const { data } = await supabase
          .from('customers')
          .select('id, email, phone, first_name, last_name, email_marketing_consent')
          .eq('organization_id', organizationId)
          .eq('phone', cust.phone)
          .maybeSingle();
        existingCust = data;
      }

      if (existingCust) {
        // Existing customer wins: consent and primary identity preserved
        customerIdMap.set(key, existingCust.id);

        const updatePayload: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };

        if (!existingCust.first_name && cust.firstName) updatePayload.first_name = cust.firstName;
        if (!existingCust.last_name && cust.lastName) updatePayload.last_name = cust.lastName;
        if (!existingCust.phone && cust.phone) updatePayload.phone = cust.phone;

        await supabase
          .from('customers')
          .update(updatePayload as unknown as Database['public']['Tables']['customers']['Update'])
          .eq('id', existingCust.id);

        updatedCustomersCount++;
      } else {
        // Create new customer with historical provenance
        const consentBool = resolveConsentPrecedence(null, cust.consentStatus);
        const resolvedEmail = cust.email || `guest_${cust.phone || Date.now()}@unwindanddoodle.local`;

        const { data: newCust, error: insErr } = await supabase
          .from('customers')
          .insert({
            organization_id: organizationId,
            email: resolvedEmail,
            phone: cust.phone || null,
            first_name: cust.firstName || null,
            last_name: cust.lastName || null,
            email_marketing_consent: consentBool,
            whatsapp_marketing_consent: consentBool && Boolean(cust.phone),
            source_system: 'bumpa',
            source_record_id: cust.sourceRecordId,
            import_batch_id: batchId,
            created_at: cust.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as unknown as Database['public']['Tables']['customers']['Insert'])
          .select('id')
          .single();

        if (insErr || !newCust) {
          warnings.push(`Could not insert customer "${resolvedEmail}": ${insErr?.message || 'Database error'}`);
          continue;
        }

        customerIdMap.set(key, newCust.id);
        importedCustomersCount++;
      }
    }

    // 6. Reconcile Orders (Batched in chunks of 50)
    const orderList = Array.from(orderMap.values());
    const CHUNK_SIZE = 50;

    for (let c = 0; c < orderList.length; c += CHUNK_SIZE) {
      const chunk = orderList.slice(c, c + CHUNK_SIZE);
      const chunkSourceIds = chunk.map((o) => o.sourceRecordId);

      // Check existing orders for idempotency
      const { data: existingDbOrders } = await supabase
        .from('orders')
        .select('id, source_record_id')
        .eq('organization_id', organizationId)
        .eq('source_system', 'bumpa')
        .in('source_record_id', chunkSourceIds);

      const existingSourceIdSet = new Set((existingDbOrders || []).map((o) => o.source_record_id));

      for (const order of chunk) {
        if (existingSourceIdSet.has(order.sourceRecordId)) {
          skippedOrdersCount++;
          continue;
        }

        const resolvedCustomerId = customerIdMap.get(order.customerKey);
        const customerProfile = customerMap.get(order.customerKey);

        const email = customerProfile?.email || `order_${order.orderNumber}@unwindanddoodle.local`;
        const phone = customerProfile?.phone || null;

        const shippingAddressPayload = {
          streetAddress: order.shippingAddress?.streetAddress || 'Historical Bumpa Order',
          city: order.shippingAddress?.city || order.shippingAddress?.state || 'Unknown',
          state: order.shippingAddress?.state || 'Unknown',
          country: 'Nigeria',
        };

        // Insert Order directly WITHOUT live domain events
        const { data: newOrder, error: ordErr } = await supabase
          .from('orders')
          .insert({
            organization_id: organizationId,
            customer_id: resolvedCustomerId || null,
            order_number: `BUMPA-${order.orderNumber}`,
            order_source: 'manual',
            source_system: 'bumpa',
            source_record_id: order.sourceRecordId,
            import_batch_id: batchId,
            email,
            phone,
            first_name: customerProfile?.firstName || null,
            last_name: customerProfile?.lastName || null,
            status: order.orderStatus as Database['public']['Enums']['order_status'],
            subtotal: Math.max(0, order.subtotal || 0),
            shipping_fee: Math.max(0, order.shippingFee || 0),
            discount_total: 0,
            total: Math.max(0, order.total || 0),
            shipping_address: shippingAddressPayload as unknown as Json,
            created_at: order.orderDate,
            placed_at: order.orderDate,
            received_at: order.orderStatus === ORDER_STATUS.RECEIVED ? order.orderDate : null,
            shipped_at:
              order.orderStatus === ORDER_STATUS.SHIPPED || order.orderStatus === ORDER_STATUS.RECEIVED
                ? order.orderDate
                : null,
            confirmed_at:
              order.orderStatus === ORDER_STATUS.CONFIRMED ||
              order.orderStatus === ORDER_STATUS.SHIPPED ||
              order.orderStatus === ORDER_STATUS.RECEIVED
                ? order.orderDate
                : null,
            updated_at: new Date().toISOString(),
          } as unknown as Database['public']['Tables']['orders']['Insert'])
          .select('id')
          .single();

        if (ordErr || !newOrder) {
          warnings.push(`Failed to import order #${order.orderNumber}: ${ordErr?.message || 'Database error'}`);
          continue;
        }

        importedOrdersCount++;

        // Insert Order Items
        for (const it of order.items) {
          if (it.mappingStatus === 'ignored') continue;

          const itemQty = Math.max(1, Math.floor(it.quantity || 1));
          const itemPrice = Math.max(0, it.unitPrice || 0);
          const itemTotal = Math.max(0, it.total || itemPrice * itemQty);

          await supabase.from('order_items').insert({
            order_id: newOrder.id,
            product_id: it.mappedProductId,
            product_name: it.historicalTitle || 'Imported Product',
            historical_product_title: it.historicalTitle,
            mapping_status: it.mappingStatus,
            quantity: itemQty,
            unit_price: itemPrice,
            total: itemTotal,
            import_batch_id: batchId,
            created_at: order.orderDate,
          } as unknown as Database['public']['Tables']['order_items']['Insert']);

          importedItemsCount++;
        }

        // Record historical payment if status is successful
        if (order.paymentStatus === PAYMENT_STATUS.SUCCESSFUL && order.total > 0) {
          try {
            await supabase.from('payments').insert({
              order_id: newOrder.id,
              amount: order.total,
              currency: 'NGN',
              provider: 'bumpa_historical',
              provider_reference: `BUMPA_PAY_${order.orderNumber}`,
              status: 'successful',
              paid_at: order.orderDate,
              created_at: order.orderDate,
            } as unknown as Database['public']['Tables']['payments']['Insert']);
          } catch {
            // Non-blocking
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const batchStatus: 'completed' | 'partial' | 'failed' =
      errors.length > 0 || (importedOrdersCount === 0 && skippedOrdersCount === 0 && orderList.length > 0)
        ? 'failed'
        : 'completed';

    // 7. Update batch record
    await supabase
      .from('import_batches')
      .update({
        status: batchStatus,
        total_rows: rows.length,
        customers_count: importedCustomersCount + updatedCustomersCount,
        orders_count: importedOrdersCount,
        items_count: importedItemsCount,
        warning_count: warnings.length,
        error_count: errors.length,
        warnings: warnings as unknown as Json,
        errors: errors as unknown as Json,
        completed_at: new Date().toISOString(),
        summary: {
          importedCustomersCount,
          updatedCustomersCount,
          importedOrdersCount,
          skippedOrdersCount,
          importedItemsCount,
          durationMs,
        } as unknown as Json,
      } as unknown as Database['public']['Tables']['import_batches']['Update'])
      .eq('id', batchId);

    // 8. Record audit log
    await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      actor_id: adminUserId,
      user_id: adminUserId,
      action: 'historical_import.completed' as unknown as Database['public']['Enums']['audit_action'],
      entity_type: 'import_batch',
      entity_id: batchId,
      before_data: null,
      after_data: {
        batchId,
        fileName,
        importedCustomersCount,
        updatedCustomersCount,
        importedOrdersCount,
        skippedOrdersCount,
        importedItemsCount,
        durationMs,
      } as unknown as Json,
    } as unknown as Database['public']['Tables']['audit_logs']['Insert']);

    return {
      batchId,
      status: batchStatus,
      importedCustomersCount,
      updatedCustomersCount,
      importedOrdersCount,
      skippedOrdersCount,
      importedItemsCount,
      warnings,
      errors,
      durationMs,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown import error';
    errors.push(errorMsg);

    await supabase
      .from('import_batches')
      .update({
        status: 'failed',
        error_count: errors.length,
        errors: errors as unknown as Json,
        completed_at: new Date().toISOString(),
      } as unknown as Database['public']['Tables']['import_batches']['Update'])
      .eq('id', batchId);

    return {
      batchId,
      status: 'failed',
      importedCustomersCount: 0,
      updatedCustomersCount: 0,
      importedOrdersCount: 0,
      skippedOrdersCount: 0,
      importedItemsCount: 0,
      warnings,
      errors,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// 5. IMPORT BATCHES LIST & DETAIL
// ============================================================================

export async function getImportBatches(
  supabase: SupabaseClient<Database>,
  organizationId: string
): Promise<ImportBatchListItem[]> {
  const { data, error } = await supabase
    .from('import_batches')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((b) => ({
    id: b.id,
    sourceSystem: b.source_system,
    status: b.status,
    fileName: b.file_name,
    totalRows: b.total_rows,
    customersCount: b.customers_count,
    ordersCount: b.orders_count,
    itemsCount: b.items_count,
    mappedProductsCount: b.mapped_products_count,
    unmappedProductsCount: b.unmapped_products_count,
    warningCount: b.warning_count,
    errorCount: b.error_count,
    createdAt: b.created_at,
    completedAt: b.completed_at,
    createdBy: b.created_by,
  }));
}
