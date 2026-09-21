import { Inngest } from 'inngest';
import { MarketingAutomationDelay } from '@/types/marketing';
import { Json } from '@/lib/supabase/types';

export interface DomainEventPayload {
  id: string;
  event_type: string;
  aggregate_type?: string;
  aggregate_id?: string;
  organization_id?: string | null;
  payload?: Json;
  created_at?: string;
}

export type InngestEvents = {
  'commerce/domain.event': {
    data: {
      domainEvent: DomainEventPayload;
    };
  };
  'marketing/automation.execute': {
    data: {
      executionId: string;
      automationId: string;
      organizationId: string;
      domainEventId: string;
      delay?: MarketingAutomationDelay;
      triggerType?: string;
      customerId?: string | null;
      customerEmail?: string;
      cartId?: string | null;
    };
  };
};

/**
 * Global Inngest client instance for Unwind & Doodle.
 * Communicates with the local dev server (`npx inngest-cli dev`) or Inngest Cloud.
 */
export const inngest = new Inngest({
  id: 'unwind-and-doodle',
  isDev: process.env.NODE_ENV !== 'production',
});
