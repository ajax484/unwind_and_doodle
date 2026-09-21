# Inngest Durable Workflow Infrastructure

## What Changed

- **Inngest Client Setup**: Created [client.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/inngest/client.ts) configuring the canonical `inngest` client for application `unwind-and-doodle`, schemas, and type-safe event definitions (`commerce/domain.event`).
- **Next.js App Router Inngest Endpoint**: Implemented [route.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/app/api/inngest/route.ts) with `serve({ client, functions })` supporting `GET`, `POST`, and `PUT` for Inngest cloud orchestration, key verification, and function discovery.
- **Marketing Event Orchestrator Durable Workflow**: Implemented [marketing.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/inngest/functions/marketing.ts) registering `marketing-event-orchestrator`, which triggers on `commerce/domain.event`, matches active marketing automations, schedules executions into `marketing_automation_executions`, and dispatches immediate executions with built-in idempotency.
- **Domain Event Dual Forwarding**: Updated [events.service.ts](file:///c:/Users/USER/work/unwind_and_doodle/src/services/events.service.ts) to forward domain events asynchronously to Inngest alongside synchronous event listener dispatching without failing core domain actions if Inngest is unreachable.
- **Automated Tests**: Created comprehensive test suite in [inngest-marketing-workflow.test.ts](file:///c:/Users/USER/work/unwind_and_doodle/tests/inngest/inngest-marketing-workflow.test.ts) validating client configuration, GET endpoint discovery, event orchestration, delay preservation, duplicate event idempotency, and graceful fallback.

## Why

To introduce durable execution workflows and eliminate reliance solely on periodic cron polling for event-driven marketing automations, while preserving existing database queue state management, multi-tenancy, and audit logs.

## Files Touched

- `src/inngest/client.ts`
- `src/inngest/functions/marketing.ts`
- `src/app/api/inngest/route.ts`
- `src/services/events.service.ts`
- `tests/inngest/inngest-marketing-workflow.test.ts`
- `docs/changes/admin/2026-09-20-inngest-durable-workflows.md`
- `docs/changes/README.md`

## Follow-ups / Known Issues

None

## Commit Message

`feat(marketing): introduce Inngest durable workflow infrastructure for marketing automation orchestration`
