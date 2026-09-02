export type AnalyticsDateRangePreset =
  | 'today'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface AnalyticsDateRange {
  preset: AnalyticsDateRangePreset;
  from: string; // ISO 8601 string
  to: string;   // ISO 8601 string
  previousFrom: string; // ISO 8601 string
  previousTo: string;   // ISO 8601 string
  label: string;
}

export interface AnalyticsMetricWithComparison {
  current: number;
  previous: number;
  percentageChange: number | null; // null if previous was 0 and current > 0 (shows 'New') or no data
  isNew?: boolean;
}

export interface SalesSeriesPoint {
  date: string; // YYYY-MM-DD or interval start
  revenue: number;
  orders: number;
}

export interface SalesBySourceItem {
  source: string;
  orders: number;
  revenue: number;
  percentageOfRevenue: number;
}

export interface SalesByChannelItem {
  channel: string;
  orders: number;
  revenue: number;
}

export interface OrderStatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface TopLocationItem {
  locationId: string | null;
  locationName: string;
  state: string;
  orders: number;
  revenue: number;
}

export interface TopProductItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
}

export interface BundleSalesItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantitySold: number;
  revenue: number;
  ordersCount: number;
}

export interface BundleComponentDemandItem {
  componentProductId: string;
  productName: string;
  sku: string | null;
  totalQuantityDemanded: number;
}

export interface ThemePopularityItem {
  themeId: string | null;
  themeName: string;
  selectionsCount: number;
}

export interface AddonPerformanceItem {
  addonProductId: string;
  productName: string;
  sku: string | null;
  quantitySold: number;
  revenue: number;
  attachRate: number | null; // percentage of eligible orders
}

export interface TopCustomerItem {
  customerId: string;
  name: string;
  email: string;
  phone: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string;
}

export interface LowStockProductItem {
  productId: string;
  productName: string;
  sku: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  status: string;
}

export interface InventoryMovementSummaryItem {
  movementType: string;
  totalMovements: number;
  totalQuantity: number;
}

export interface WarehouseBreakdownItem {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  productCount: number;
}

export interface ProviderRevenueItem {
  provider: string;
  paymentsCount: number;
  revenue: number;
}

// Full Overview Response
export interface AnalyticsOverviewData {
  kpis: {
    revenue: AnalyticsMetricWithComparison;
    orders: AnalyticsMetricWithComparison;
    paidOrders: AnalyticsMetricWithComparison;
    aov: AnalyticsMetricWithComparison;
    newCustomers: AnalyticsMetricWithComparison;
    grossOrderValue: AnalyticsMetricWithComparison;
    totalDiscountGiven: AnalyticsMetricWithComparison;
  };
  salesBySource: SalesBySourceItem[];
  salesByChannel: SalesByChannelItem[];
  orderStatusBreakdown: OrderStatusBreakdownItem[];
  topLocations: TopLocationItem[];
  topProducts: TopProductItem[];
  recentSeries: SalesSeriesPoint[];
}

// Products Tab Response
export interface ProductAnalyticsData {
  topProducts: TopProductItem[];
  bundleSales: BundleSalesItem[];
  componentDemand: BundleComponentDemandItem[];
  themePopularity: ThemePopularityItem[];
  addonPerformance: AddonPerformanceItem[];
}

// Customers Tab Response
export interface CustomerAnalyticsData {
  kpis: {
    newCustomers: AnalyticsMetricWithComparison;
    purchasingCustomers: AnalyticsMetricWithComparison;
    returningCustomers: AnalyticsMetricWithComparison;
    repeatPurchaseRate: AnalyticsMetricWithComparison;
    guestOrders: AnalyticsMetricWithComparison;
    registeredOrders: AnalyticsMetricWithComparison;
    newAccounts: AnalyticsMetricWithComparison;
  };
  topCustomers: TopCustomerItem[];
}

// Inventory Tab Response
export interface InventoryAnalyticsData {
  summary: {
    totalStock: number;
    availableStock: number;
    reservedStock: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStockProducts: LowStockProductItem[];
  outOfStockProducts: LowStockProductItem[];
  movementBreakdown: InventoryMovementSummaryItem[];
  warehouseBreakdown: WarehouseBreakdownItem[];
}

// Checkout Tab Response
export interface CheckoutAnalyticsData {
  checkoutSessions: {
    totalSessions: number;
    completedSessions: number;
    abandonedSessions: number;
    activeSessions: number;
    conversionRate: number; // percentage
  };
  payments: {
    successfulPayments: number;
    failedPayments: number;
    successRate: number; // percentage
    providerBreakdown: ProviderRevenueItem[];
  };
}
