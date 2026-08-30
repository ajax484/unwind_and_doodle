import { z } from 'zod';

// ==========================================
// ZOD SCHEMAS FOR INVENTORY MUTATIONS
// ==========================================

export const StockAdjustmentSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  product_id: z.string().min(1, 'Product is required'),
  adjustment_quantity: z.number().int().refine((val) => val !== 0, {
    message: 'Adjustment quantity must be non-zero (positive or negative)',
  }),
  reason: z.string().min(2, 'Reason is required (e.g. Damaged goods, Stock audit count)'),
  note: z.string().optional().nullable(),
});

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

export const StockReceiptItemSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
  cost_price: z.number().min(0, 'Cost price must be 0 or greater'),
});

export const CreateStockReceiptSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  reference: z.string().min(1, 'Receipt reference/GRN is required'),
  notes: z.string().optional().nullable(),
  received_at: z.string().optional(),
  items: z.array(StockReceiptItemSchema).min(1, 'At least one product item is required'),
});

export type CreateStockReceiptInput = z.infer<typeof CreateStockReceiptSchema>;

export const WarehouseSchema = z.object({
  name: z.string().min(1, 'Warehouse name is required'),
  address_line_1: z.string().optional().nullable(),
  address_line_2: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  lga: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export const UpdateWarehouseSchema = WarehouseSchema.partial();

export type WarehouseInput = z.infer<typeof WarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseSchema>;

export const LocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  state: z.string().min(1, 'State is required'),
  lga: z.string().optional().nullable(),
});

export const UpdateLocationSchema = LocationSchema.partial();

export type LocationInput = z.infer<typeof LocationSchema>;
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>;

export const DeliveryRateSchema = z.object({
  warehouse_id: z.string().min(1, 'Warehouse is required'),
  location_id: z.string().min(1, 'Location is required'),
  price: z.number().min(0, 'Price must be 0 or greater'),
  active: z.boolean().default(true),
});

export type DeliveryRateInput = z.infer<typeof DeliveryRateSchema>;

export const AdminInventoryFilterSchema = z.object({
  search: z.string().optional(),
  warehouseId: z.string().optional(),
  stockStatus: z.enum(['all', 'in_stock', 'out_of_stock']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

export type AdminInventoryFilterInput = z.infer<typeof AdminInventoryFilterSchema>;

// ==========================================
// TYPESCRIPT RESPONSE MODELS
// ==========================================

export interface AdminInventoryItem {
  id: string; // inventory row id
  productId: string;
  productName: string;
  productSlug: string;
  sku: string | null;
  productType: 'physical' | 'custom';
  primaryImage: string | null;
  costPrice: number;
  sellingPrice: number;
  warehouseId: string;
  warehouseName: string;
  quantityOnHand: number;
  quantityReserved: number;
  availableToSell: number;
  updatedAt: string;
}

export interface AdminInventorySummaryMetrics {
  totalProductsTracked: number;
  outOfStockCount: number;
  totalReservedUnits: number;
  estimatedInventoryValue: number; // sum(quantity * cost_price)
}

export interface AdminInventoryListResponse {
  inventory: AdminInventoryItem[];
  summary: AdminInventorySummaryMetrics;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminInventoryMovementItem {
  id: string;
  movementType: 'purchase' | 'sale' | 'reservation' | 'release' | 'adjustment' | 'return' | 'transfer_in' | 'transfer_out';
  quantity: number;
  warehouseId: string;
  warehouseName: string;
  referenceId: string | null;
  note: string | null;
  createdAt: string;
}

export interface AdminProductInventoryDetail {
  productId: string;
  productName: string;
  productSlug: string;
  sku: string | null;
  costPrice: number;
  sellingPrice: number;
  primaryImage: string | null;
  totalStockOnHand: number;
  totalStockReserved: number;
  totalAvailableToSell: number;
  warehouses: {
    warehouseId: string;
    warehouseName: string;
    warehouseState: string | null;
    quantityOnHand: number;
    quantityReserved: number;
    availableToSell: number;
    updatedAt: string;
  }[];
  movements: AdminInventoryMovementItem[];
}

export interface AdminStockReceiptListItem {
  id: string;
  reference: string | null;
  warehouseId: string;
  warehouseName: string;
  notes: string | null;
  receivedAt: string;
  createdAt: string;
  totalItemsCount: number;
  totalUnitsReceived: number;
  totalReceiptCost: number;
}

export interface AdminStockReceiptDetail extends AdminStockReceiptListItem {
  items: {
    id: string;
    productId: string;
    productName: string;
    productSku: string | null;
    quantity: number;
    costPrice: number;
    lineTotal: number;
  }[];
}

export interface AdminWarehouseListItem {
  id: string;
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  state: string | null;
  lga: string | null;
  active: boolean;
  assignedLocationsCount: number;
  createdAt: string;
}

export interface AdminLocationItem {
  id: string;
  name: string;
  state: string;
  lga: string | null;
  createdAt: string;
}

export interface AdminDeliveryRateItem {
  id: string;
  warehouseId: string;
  warehouseName: string;
  locationId: string;
  locationName: string;
  locationState: string;
  price: number;
  active: boolean;
}
