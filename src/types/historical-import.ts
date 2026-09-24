/**
 * Types for Historical Customer & Order Migration (Bumpa -> Unwind & Doodle)
 */

export type BumpaConsentStatus = 'opted_in' | 'opted_out' | 'unknown';
export type ProductMappingStatus = 'mapped' | 'unmapped' | 'ignored';

export interface HistoricalProductSummary {
  historicalTitle: string;
  normalizedTitle: string;
  occurrences: number;
  suggestedProductId: string | null;
  suggestedProductName: string | null;
  confidence: number;
  status: ProductMappingStatus;
  potentialMatches?: Array<{ id: string; name: string }>;
}

export interface ParsedHistoricalCustomer {
  sourceRecordId: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  consentStatus: BumpaConsentStatus;
  createdAt: string | null;
  isExisting: boolean;
  existingCustomerId?: string;
}

export interface ParsedHistoricalOrderItem {
  historicalTitle: string;
  quantity: number;
  unitPrice: number;
  total: number;
  mappedProductId: string | null;
  mappingStatus: ProductMappingStatus;
}

export interface ParsedHistoricalOrder {
  sourceRecordId: string;
  orderNumber: string;
  customerKey: string;
  orderDate: string;
  orderStatus: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  shippingAddress: {
    streetAddress?: string;
    city?: string;
    state?: string;
    lga?: string;
  };
  items: ParsedHistoricalOrderItem[];
}

export interface ImportPreviewReport {
  batchId?: string;
  fileName: string;
  totalRows: number;
  customers: {
    total: number;
    newCount: number;
    existingCount: number;
    invalidCount: number;
  };
  orders: {
    total: number;
    validCount: number;
    invalidCount: number;
    duplicateCount: number;
  };
  products: {
    totalDistinct: number;
    mappedCount: number;
    unmappedCount: number;
    ambiguousCount: number;
    items: HistoricalProductSummary[];
  };
  consent: {
    optedInCount: number;
    optedOutCount: number;
    unknownCount: number;
  };
  warnings: string[];
  errors: string[];
  canProceed: boolean;
  catalogProducts?: Array<{ id: string; name: string; status: string }>;
}

export interface ConfirmedProductMappingItem {
  targetProductId: string | null;
  status: ProductMappingStatus;
}

export interface ExecuteImportInput {
  fileName: string;
  csvContent: string;
  confirmedProductMappings: Record<string, ConfirmedProductMappingItem>;
}

export interface ExecuteImportResult {
  batchId: string;
  status: 'completed' | 'failed' | 'partial';
  importedCustomersCount: number;
  updatedCustomersCount: number;
  importedOrdersCount: number;
  skippedOrdersCount: number;
  importedItemsCount: number;
  warnings: string[];
  errors: string[];
  durationMs: number;
}

export interface ImportBatchListItem {
  id: string;
  sourceSystem: string;
  status: string;
  fileName: string;
  totalRows: number;
  customersCount: number;
  ordersCount: number;
  itemsCount: number;
  mappedProductsCount: number;
  unmappedProductsCount: number;
  warningCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
  createdBy: string | null;
}
