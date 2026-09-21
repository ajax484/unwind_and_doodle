import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  marketingEventOrchestrator,
  marketingAutomationRunner,
  scanAbandonedCheckoutsFunction,
  scanInactiveCustomersFunction,
  dispatchScheduledCampaignsFunction,
  recoverStaleMarketingExecutionsFunction,
} from '@/inngest/functions/marketing';

/**
 * Next.js App Router endpoint for Inngest communication.
 * Handles event registration, execution scheduling, and signing authentication.
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    marketingEventOrchestrator,
    marketingAutomationRunner,
    scanAbandonedCheckoutsFunction,
    scanInactiveCustomersFunction,
    dispatchScheduledCampaignsFunction,
    recoverStaleMarketingExecutionsFunction,
  ],
});


