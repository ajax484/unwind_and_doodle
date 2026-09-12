import { Database, Json } from '@/lib/supabase/types';

// ============================================================================
// DATABASE DERIVED ENUMS
// ============================================================================
export type MarketingCampaignType = Database['public']['Enums']['marketing_campaign_type'];
export type MarketingCampaignStatus = Database['public']['Enums']['marketing_campaign_status'];
export type MarketingRecipientStatus = Database['public']['Enums']['marketing_recipient_status'];
export type MarketingAutomationType = Database['public']['Enums']['marketing_automation_type'];
export type MarketingAutomationStatus = Database['public']['Enums']['marketing_automation_status'];
export type MarketingEmailEventType = Database['public']['Enums']['marketing_email_event_type'];

// ============================================================================
// PAGINATION INTERFACES
// ============================================================================
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// 1. MARKETING SEGMENTS
// ============================================================================
export type MarketingSegment = Database['public']['Tables']['marketing_segments']['Row'];
export type MarketingSegmentInsert = Database['public']['Tables']['marketing_segments']['Insert'];
export type MarketingSegmentUpdate = Database['public']['Tables']['marketing_segments']['Update'];

export interface CreateMarketingSegmentInput {
  name: string;
  description?: string | null;
  rules?: Json;
  active?: boolean;
}

export interface UpdateMarketingSegmentInput {
  name?: string;
  description?: string | null;
  rules?: Json;
  active?: boolean;
}

export interface MarketingSegmentFilter {
  active?: boolean;
  search?: string;
}

// ============================================================================
// 2. MARKETING CAMPAIGNS
// ============================================================================
export type MarketingCampaign = Database['public']['Tables']['marketing_campaigns']['Row'];
export type MarketingCampaignInsert = Database['public']['Tables']['marketing_campaigns']['Insert'];
export type MarketingCampaignUpdate = Database['public']['Tables']['marketing_campaigns']['Update'];

export type MarketingCampaignListItem = Pick<
  MarketingCampaign,
  | 'id'
  | 'organization_id'
  | 'name'
  | 'type'
  | 'status'
  | 'subject'
  | 'preview_text'
  | 'segment_id'
  | 'scheduled_at'
  | 'started_at'
  | 'completed_at'
  | 'created_at'
  | 'updated_at'
>;

export interface CreateMarketingCampaignInput {
  name: string;
  type?: MarketingCampaignType;
  status?: MarketingCampaignStatus;
  subject?: string | null;
  preview_text?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  content?: Json;
  segment_id?: string | null;
  scheduled_at?: string | null;
  created_by?: string | null;
}

export interface UpdateMarketingCampaignInput {
  name?: string;
  type?: MarketingCampaignType;
  status?: MarketingCampaignStatus;
  subject?: string | null;
  preview_text?: string | null;
  sender_name?: string | null;
  sender_email?: string | null;
  content?: Json;
  segment_id?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface MarketingCampaignFilter {
  status?: MarketingCampaignStatus;
  type?: MarketingCampaignType;
  segment_id?: string;
  scheduled_at?: string;
}

// ============================================================================
// 3. MARKETING CAMPAIGN RECIPIENTS
// ============================================================================
export type MarketingCampaignRecipient = Database['public']['Tables']['marketing_campaign_recipients']['Row'];
export type MarketingCampaignRecipientInsert = Database['public']['Tables']['marketing_campaign_recipients']['Insert'];
export type MarketingCampaignRecipientUpdate = Database['public']['Tables']['marketing_campaign_recipients']['Update'];

export interface MarketingRecipientFilter {
  status?: MarketingRecipientStatus;
  search?: string;
}

export interface RecipientStatusCounts {
  total: number;
  pending: number;
  sending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
}

// ============================================================================
// 4. MARKETING EMAIL EVENTS
// ============================================================================
export type MarketingEmailEvent = Database['public']['Tables']['marketing_email_events']['Row'];
export type MarketingEmailEventInsert = Database['public']['Tables']['marketing_email_events']['Insert'];
export type MarketingEmailEventUpdate = Database['public']['Tables']['marketing_email_events']['Update'];

export interface MarketingEmailEventFilter {
  event_type?: MarketingEmailEventType;
}

export interface CampaignEventCounts {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
}

// ============================================================================
// 5. CAMPAIGN ANALYTICS
// ============================================================================
export interface CampaignAnalytics {
  recipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  unsubscribed: number;
  deliveryRate: number; // delivered / sent
  openRate: number;     // opened / delivered
  clickRate: number;    // clicked / delivered
  bounceRate: number;   // bounced / sent
  unsubscribeRate: number; // unsubscribed / delivered
}

// ============================================================================
// 6. MARKETING AUTOMATIONS
// ============================================================================
export type MarketingAutomation = Database['public']['Tables']['marketing_automations']['Row'];
export type MarketingAutomationInsert = Database['public']['Tables']['marketing_automations']['Insert'];
export type MarketingAutomationUpdate = Database['public']['Tables']['marketing_automations']['Update'];

export interface CreateMarketingAutomationInput {
  name: string;
  type: MarketingAutomationType;
  status?: MarketingAutomationStatus;
  config?: Json;
  created_by?: string | null;
}

export interface UpdateMarketingAutomationInput {
  name?: string;
  type?: MarketingAutomationType;
  status?: MarketingAutomationStatus;
  config?: Json;
}

export interface MarketingAutomationFilter {
  status?: MarketingAutomationStatus;
  type?: MarketingAutomationType;
}

// ============================================================================
// 7. MARKETING SEGMENTATION ENGINE
// ============================================================================

export type CustomerSegmentField =
  | 'email'
  | 'first_name'
  | 'last_name'
  | 'email_marketing_consent'
  | 'whatsapp_marketing_consent'
  | 'created_at';

export type PurchaseSegmentField =
  | 'last_order_at'
  | 'order_count'
  | 'total_spent';

export type SegmentField = CustomerSegmentField | PurchaseSegmentField;

export type SegmentOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'before'
  | 'after'
  | 'between'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'is_null'
  | 'is_not_null';

export interface SegmentCondition {
  field: SegmentField;
  operator: SegmentOperator;
  value?: unknown;
}

export interface SegmentRules {
  match: 'all' | 'any';
  conditions: SegmentCondition[];
}

export interface SegmentCustomer {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export interface SegmentCustomerOptions {
  limit?: number;
  offset?: number;
}

export interface SegmentCustomerPreviewResult {
  customers: SegmentCustomer[];
  total: number;
}

export class SegmentRuleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SegmentRuleValidationError';
  }
}
