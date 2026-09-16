# Marketing Background Workers & Durable Automation (Future Plan)

This document outlines architectural evaluations and implementation roadmaps for running background tasks, cron scheduling, and multi-step marketing automation workflows in Unwind & Doodle.

---

## 1. Context & Current State

Our marketing automation pipeline consists of:
- **Event Ingestion**: `publishDomainEvent` in `src/services/events.service.ts` publishing commerce events (`customer.created`, `order.created`, `checkout.abandoned`, `review.submitted`).
- **Database Queue**: `marketing_automation_executions` storing pending, delayed, and executed jobs with idempotency keys (`UNIQUE (automation_id, domain_event_id)`).
- **Execution Engine**: `src/services/marketing-executor.service.ts` performing just-in-time checks (consent re-verification, order completion detection) and sending emails.
- **Current Cron Endpoints**:
  - `POST /api/admin/marketing/automations/process-due` (processes delayed automations)
  - `POST /api/admin/marketing/campaigns/dispatch-scheduled` (dispatches scheduled broadcast campaigns)

Both endpoints currently require an external scheduler or cron trigger passing `Authorization: Bearer ${CRON_SECRET}`.

---

## 2. Evaluation of Background Worker Candidates

We evaluated three potential systems to handle cron execution, background retries, and multi-stage workflow automation:

| Feature / Criteria | **Inngest** | **Upstash QStash** | **Trigger.dev v3** |
| :--- | :--- | :--- | :--- |
| **Primary Category** | Event-driven durable execution engine | Serverless HTTP message queue & scheduler | Dedicated containerized worker runtime |
| **Hosting Model** | Runs inside Next.js route (`/api/inngest`) | External HTTP webhook caller to our routes | Deployed separately to Trigger.dev cloud containers |
| **Step-Level Checkpointing** | ✅ Yes (`step.run`, `step.sleep`) | ❌ No (retries entire HTTP endpoint) | ✅ Yes |
| **Event Cancellation** | ✅ Yes (`step.waitForEvent`) | ❌ No | ✅ Yes |
| **Execution Timeouts** | Individual steps get fresh function runtime | Subject to Next.js route timeout (15–60s) | Zero timeouts (hours-long jobs supported) |
| **Local Development DX** | ⭐ Excellent (`npx inngest-cli dev` web UI) | Relies on local tunnels (ngrok/localtunnel) | Good CLI, external sync |
| **Refactor Needed** | Medium (wrap service calls in step functions) | Zero (drop-in cron caller for current routes) | High (split deployment & worker config) |
| **Fit for Unwind & Doodle** | **Best for Multi-Step Drips & Automations** | **Best Quick Drop-In for Cron** | **Overkill** (suited for heavy compute / media) |

---

## 3. Path A: Zero-Refactor Drop-In (Upstash QStash)

If the goal is simply to trigger our existing endpoints reliably without writing new application code:

- **Role**: QStash acts as an external resilient cron scheduler replacing standard Vercel Cron.
- **Workflow**:
  - QStash calls `POST https://unwind-and-doodle.com/api/admin/marketing/automations/process-due` every 1–5 minutes.
  - Passes `Authorization: Bearer ${CRON_SECRET}`.
- **Advantages**:
  - Automatic exponential backoff retries if our server is restarting or returns a 500 error.
  - Dead Letter Queue (DLQ) to inspect and replay permanently failed runs.
  - Zero changes to existing Next.js business logic.
- **Limitations**:
  - Batch size is bounded by the Next.js serverless HTTP timeout.

---

## 4. Path B: Event-Driven Durable Workflows (Inngest)

Path B elevates our marketing automation from a passive database-polling model into an active, event-driven, durable workflow engine.

### Architecture

```
[Domain Event] (e.g. checkout.abandoned)
      │
      ▼
[publishDomainEvent] ──► inngest.send('commerce/domain-event')
                              │
                              ▼
                   [Inngest Function Handler]
                              │
       ┌──────────────────────┴───────────────────────────────────────┐
       │ Step 1: Query matching automations in Supabase               │
       │                                                              │
       │ Step 2: Record "pending" in marketing_automation_executions  │
       │                                                              │
       │ Step 3: step.sleep(delay) (e.g. 2 hours — server sleeps)     │
       │                                                              │
       │ Step 4: step.run('jit-checks') (verify consent & purchases)  │
       │                                                              │
       │ Step 5: step.run('send-email') (delivery + link tracking)    │
       │                                                              │
       │ Step 6: Mark "completed" in marketing_automation_executions  │
       └──────────────────────────────────────────────────────────────┘
```

### Why Path B is Superior for Marketing Automations

1. **Eliminates Polling Overhead**: Rather than having a cron run 1,440 times a day querying Postgres for due jobs, Inngest wakes up precisely when a delayed step is ready.
2. **Native Race-Condition Cancellation**: For abandoned checkout drips:
   ```ts
   // Inngest waits up to 2 hours for an order, or times out and proceeds
   const orderPlaced = await step.waitForEvent('wait-for-purchase', {
     event: 'commerce/order.created',
     timeout: '2h',
     match: 'data.customerId',
   });

   if (orderPlaced) {
     // Customer completed purchase during wait window: cancel email flow automatically!
     return;
   }
   ```
3. **Step Checkpointing & Isolation**: If an external email provider (Resend, SendGrid) suffers an outage, Inngest only retries the `send-email` step — it will not duplicate customer creation, re-query the database, or double-charge a user.
4. **Preserves UI Auditability**: By writing execution status changes into `marketing_automation_executions` inside each `step.run`, our Admin UI (`/admin/marketing/automations/[id]`) continues to display real-time execution logs with status badges and skip reasons.

---

## 5. Technical Implementation Blueprint for Inngest

### Step 1: Dependencies & Environment Variables
```bash
npm install inngest
```

Environment variables needed (`.env`):
```env
# Required only for production / staging
INNGEST_EVENT_KEY=ink_...
INNGEST_SIGNING_KEY=signkey-...
```

### Step 2: Inngest Client (`src/inngest/client.ts`)
```ts
import { Inngest } from 'inngest';

export const inngest = new Inngest({
  id: 'unwind-and-doodle',
});
```

### Step 3: Next.js App Router Handler (`src/app/api/inngest/route.ts`)
```ts
import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import { handleMarketingAutomationEventFunction } from '@/inngest/functions/marketing';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    handleMarketingAutomationEventFunction,
  ],
});
```

### Step 4: Marketing Workflow Function (`src/inngest/functions/marketing.ts`)
```ts
import { inngest } from '../client';
import { getServiceSupabaseClient } from '@/lib/supabase/client';
import { matchesAutomationTrigger } from '@/services/marketing-automation.service';
import { executeSingleAutomation } from '@/services/marketing-executor.service';

export const handleMarketingAutomationEventFunction = inngest.createFunction(
  { id: 'marketing-automation-executor', retries: 3 },
  { event: 'commerce/domain-event' },
  async ({ event, step }) => {
    const { domainEvent } = event.data;
    const supabase = getServiceSupabaseClient();

    // 1. Resolve matching active automations
    const matchingAutomations = await step.run('find-matching-automations', async () => {
      const { data } = await supabase
        .from('marketing_automations')
        .select('*')
        .eq('organization_id', domainEvent.organization_id)
        .eq('status', 'active');

      return (data || []).filter(auto => matchesAutomationTrigger(auto, domainEvent));
    });

    // 2. Process each automation flow
    for (const automation of matchingAutomations) {
      const delayMinutes = automation.config.delay?.value || 0;

      if (delayMinutes > 0) {
        // Sleep durably without keeping any serverless compute alive
        await step.sleep(`sleep-${automation.id}`, `${delayMinutes}m`);
      }

      // 3. Execute with just-in-time checks and local DB audit logging
      await step.run(`execute-${automation.id}`, async () => {
        return await executeSingleAutomation(supabase, {
          automation,
          domainEvent,
        });
      });
    }
  }
);
```

### Step 5: Trigger from Domain Events (`src/services/events.service.ts`)
Update `publishDomainEvent` to forward events asynchronously:
```ts
if (process.env.NODE_ENV !== 'test') {
  await inngest.send({
    name: 'commerce/domain-event',
    data: { domainEvent: createdEvent },
  });
}
```

---

## 6. Migration & Rollout Plan

1. **Phase 1 (Immediate / Staging)**:
   - Use Upstash QStash to hit `/api/admin/marketing/automations/process-due` every minute.
   - Requires zero code changes, immediately operationalizing Step 2B.
2. **Phase 2 (Inngest Adoption)**:
   - Install `inngest`.
   - Implement `src/inngest/client.ts`, `src/app/api/inngest/route.ts`, and `src/inngest/functions/marketing.ts`.
   - Test locally using `npx inngest-cli dev`.
   - Verify that `marketing_automation_executions` receives state updates and tests pass.
3. **Phase 3 (Deprecate Polling)**:
   - Route domain events through Inngest.
   - Decommission the periodic cron for automations (keep campaign scheduled dispatcher or migrate it as well).
