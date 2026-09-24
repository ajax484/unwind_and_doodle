/**
 * Marketing Personalization Context & Recommendation Types
 *
 * Provides strongly-typed models for contextual token resolution,
 * product family classification, and dynamic cross-sell recommendations
 * across transactional, automation, and campaign email journeys.
 */

export type ProductFamily =
  | 'general_colouring_book'
  | 'unwind_kit'
  | 'ultimate_game_book'
  | 'play_and_color'
  | 'vent_to_me'
  | 'standard_custom'
  | 'full_custom'
  | 'tools'
  | 'other';

/**
 * Structured product recommendation representation.
 * Keeps domain recommendation logic cleanly decoupled from presentation.
 */
export interface MarketingRecommendation {
  productId: string;
  productFamily: ProductFamily;
  title: string;
  description?: string;
  url?: string;
  reasoning?: string;
  /**
   * Pre-rendered narrative block formatted per playbook specifications
   * for either post-purchase cross-sell or sales win-back.
   */
  recommendationText?: string;
}

/**
 * Fully-resolved marketing context passed to email renderers.
 * Contains sanitized scalar values and structured recommendations.
 */
export interface MarketingContext {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;

  orderNumber?: string | null;
  productName?: string | null;
  lastProduct?: string | null;

  productRecommendation?: MarketingRecommendation | null;
  personalizedRecommendation?: MarketingRecommendation | null;
}

/**
 * Input parameters supplied to the marketing context resolver.
 */
export interface ResolveMarketingContextInput {
  organizationId?: string | null;
  customerId?: string | null;
  customerEmail?: string | null;
  orderId?: string | null;
  orderNumber?: string | null;
  productName?: string | null;
  campaignId?: string | null;
  automationType?: string | null;
  domainEventPayload?: Record<string, unknown> | null;
  cartId?: string | null;
}
