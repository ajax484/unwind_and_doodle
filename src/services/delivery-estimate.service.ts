import {
  DeliveryEstimate,
  DeliveryEstimateConfig,
  DEFAULT_DELIVERY_ESTIMATE_CONFIG,
} from '@/types/marketing';

/**
 * Checks if a shipping state / region represents Lagos or Abuja (Federal Capital Territory).
 */
export function isLagosOrAbujaState(stateOrRegion?: string | null): boolean {
  if (!stateOrRegion || typeof stateOrRegion !== 'string') {
    return false;
  }

  const normalized = stateOrRegion.trim().toLowerCase();

  // Lagos checks
  if (normalized === 'lagos' || normalized.includes('lagos')) {
    return true;
  }

  // Abuja / FCT checks
  if (
    normalized === 'abuja' ||
    normalized.includes('abuja') ||
    normalized === 'fct' ||
    normalized.includes('fct') ||
    normalized.includes('federal capital territory')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether an order includes custom or personalized items that require production lead time.
 */
export function checkOrderHasCustomItems(
  items?: Array<{
    id?: string;
    product_name?: string;
    customization_data?: unknown;
    supports_theme_customization?: boolean;
    is_custom?: boolean;
    has_customization?: boolean;
  }> | null
): boolean {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.some((item) => {
    if (item.is_custom || item.supports_theme_customization || item.has_customization) {
      return true;
    }

    if (
      item.customization_data &&
      typeof item.customization_data === 'object' &&
      Object.keys(item.customization_data).length > 0
    ) {
      return true;
    }

    if (item.product_name && /custom|personalized|bespoke/i.test(item.product_name)) {
      return true;
    }

    return false;
  });
}

/**
 * Resolves the base order date from an order record.
 */
export function resolveOrderBaseDate(order: {
  placed_at?: string | null;
  created_at?: string;
  confirmed_at?: string | null;
  shipped_at?: string | null;
}): Date {
  const dateStr = order.placed_at || order.created_at || order.confirmed_at || order.shipped_at;
  return dateStr ? new Date(dateStr) : new Date();
}

/**
 * Calculates deterministic delivery estimate for an untracked order based on destination and item customization.
 *
 * Business Rules:
 * - Abuja / Lagos: +2 days shipping
 * - Other Nigerian states: +6 days shipping
 * - Custom items: +3 days production delay added to applicable shipping delay
 */
export function calculateEstimatedDelivery(
  order: {
    id: string;
    placed_at?: string | null;
    created_at?: string;
    confirmed_at?: string | null;
    shipped_at?: string | null;
    shipping_address?: unknown;
  },
  items?: Array<{
    id?: string;
    product_name?: string;
    customization_data?: unknown;
    supports_theme_customization?: boolean;
    is_custom?: boolean;
    has_customization?: boolean;
  }> | null,
  config: DeliveryEstimateConfig = DEFAULT_DELIVERY_ESTIMATE_CONFIG
): DeliveryEstimate {
  const baseDate = resolveOrderBaseDate(order);

  // 1. Resolve destination state
  let stateStr = '';
  if (order.shipping_address && typeof order.shipping_address === 'object') {
    const addr = order.shipping_address as Record<string, unknown>;
    stateStr =
      (addr.state as string) ||
      (addr.province as string) ||
      (addr.region as string) ||
      (addr.city as string) ||
      '';
  }

  const isLagosOrAbuja = isLagosOrAbujaState(stateStr);
  const shippingDays = isLagosOrAbuja
    ? config.lagosAbujaShippingDays
    : config.otherStatesShippingDays;

  // 2. Check for custom items
  const hasCustomItems = checkOrderHasCustomItems(items);
  const productionDays = hasCustomItems ? config.customItemProductionDays : 0;

  // 3. Compute estimated delivery timestamp
  const totalDelayDays = shippingDays + productionDays;
  const estimatedDeliveryAt = new Date(
    baseDate.getTime() + totalDelayDays * 24 * 60 * 60 * 1000
  );

  return {
    estimatedDeliveryAt,
    source: 'estimated',
    shippingDays,
    productionDays,
    isLagosOrAbuja,
    hasCustomItems,
  };
}
