# 2026-09-02: Teams & Permissions System

## What Changed
Implemented a complete multi-tenant **Teams & Permissions** system scoped to organizations for the commerce platform.
* **Database & RLS**:
  - Created `organization_invitations` table with cryptographically secure tokens, expiration timestamps, email constraints, and indexing.
  - Configured PostgreSQL Row Level Security (RLS) policies on `organization_invitations` and `organization_members` ensuring complete tenant isolation.
  - Added role check constraints supporting `owner`, `admin`, and `staff` roles.
* **Centralized Permission Layer**:
  - Implemented `src/services/permission.service.ts` with capability-based permission mapping and authorization utilities (`can`, `hasPermission`, `requirePermission`, `getRolePermissions`).
  - Roles defined:
    - `owner`: Complete administrative control, billing/settings management, cannot be removed or demoted.
    - `admin`: Full operational capabilities across products, bundles, inventory, orders, customers, discounts, reviews, and team members.
    - `staff`: Operational capabilities over products, inventory, orders, and customers with view-only permissions for discounts and analytics, excluding team or store settings.
* **Team Management Service & API Routes**:
  - Created `src/services/team.service.ts` managing member listing, role updates, member removal, and the full invitation lifecycle (create, resend, cancel, accept).
  - API Routes implemented:
    - `GET /api/admin/team`: Lists members and pending invitations for the active organization.
    - `POST /api/admin/team/invite`: Creates a 32-byte crypto token invitation and sends an email.
    - `POST /api/admin/team/invitations/[id]/resend`: Extends expiration and resends invitation.
    - `DELETE /api/admin/team/invitations/[id]`: Revokes a pending invitation.
    - `PATCH /api/admin/team/members/[id]`: Updates member role with safeguards.
    - `DELETE /api/admin/team/members/[id]`: Removes a member with owner/last-admin protections.
    - `GET /api/invitations/[token]`: Public endpoint for verifying invitation metadata.
    - `POST /api/invitations/[token]/accept`: Accepts an invitation with strict email matching.
* **Audit Logging**:
  - Integrated audit logs via `recordAdminAuditLog` across all team events (invites, cancellations, resends, role changes, removals, acceptances).
* **UI & Navigation**:
  - Created Team Management page at `src/app/admin/settings/team/page.tsx` with metrics cards, active members table, pending invites table, and modals for inviting, editing roles, and confirming destructive actions.
  - Created public invitation acceptance screen at `src/app/invite/[token]/page.tsx` handling unauthenticated, authenticated matching, and account mismatch states.
  - Updated `src/app/admin/layout.tsx` to dynamically filter sidebar navigation and display role badges (`👑 Owner`, `🛡️ Admin`, `👤 Staff`).
* **Automated Tests**:
  - Created `tests/teams-and-permissions.test.ts` verifying role matrices, member operations, invitation lifecycle, email mismatch prevention, and edge cases.

## Why
To allow store owners and administrators to invite team members, assign operational roles, manage members, restrict dashboard access to authorized capabilities, and maintain complete tenant security without hardcoded client-side role checks.

## Files Touched
* `supabase/migrations/20260902000001_teams_and_permissions.sql`
* `src/lib/supabase/types.ts`
* `src/types/admin-team.ts`
* `src/services/permission.service.ts`
* `src/services/team.service.ts`
* `src/services/notification.service.ts`
* `src/app/api/admin/session/route.ts`
* `src/app/api/admin/team/route.ts`
* `src/app/api/admin/team/invite/route.ts`
* `src/app/api/admin/team/invitations/[id]/resend/route.ts`
* `src/app/api/admin/team/invitations/[id]/route.ts`
* `src/app/api/admin/team/members/[id]/route.ts`
* `src/app/api/invitations/[token]/route.ts`
* `src/app/api/invitations/[token]/accept/route.ts`
* `src/app/admin/layout.tsx`
* `src/app/admin/settings/team/page.tsx`
* `src/app/invite/[token]/page.tsx`
* `tests/mocks/supabase.mock.ts`
* `tests/teams-and-permissions.test.ts`
* `docs/changes/2026-09-02-teams-and-permissions.md`

## Follow-ups / Known Issues
* None. Future custom roles can be defined in `permission.service.ts` without database schema changes.

## Commit Message
```
feat: implement multi-tenant teams and permissions system

- Add organization_invitations table with RLS policies and crypto token generation
- Introduce centralized capability-based permission layer (can/hasPermission/requirePermission)
- Support owner, admin, and staff roles with strict server-side authorization
- Implement invitation dispatch, resend, cancel, and email-verified acceptance flows
- Add Team settings dashboard and public invitation acceptance UI
- Integrate audit logging across all team mutation events
- Add automated unit and integration tests for permission and team flows
```
