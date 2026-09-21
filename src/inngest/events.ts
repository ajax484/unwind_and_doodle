import { Json } from '@/lib/supabase/types';

export interface CommerceDomainEventPayload {
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
      domainEvent: CommerceDomainEventPayload;
    };
  };
};
