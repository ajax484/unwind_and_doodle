# 2026-09-02: Separate Admin and User Login

## What Changed
Separated the login flows and portals for **Store Administrators / Team Members** and **Store Customers**:
* **Admin Login Portal (`/admin/login`)**:
  - Created a dedicated administrative sign-in portal styled to match the dark/slate Admin Console theme (`#0F172A` / `#1E293B` accents, security shield icon, rose highlight badges).
  - Supports administrative Email & Password sign-in and Email OTP verification.
  - Automatically verifies organization membership upon login (`/api/admin/session`), immediately rejecting non-admin users with a clear message.
  - Automatically redirects authenticated admins directly to their destination (`/admin`).
* **Customer Auth Page (`/auth`)**:
  - Streamlined `/auth` for shoppers and customer accounts (`/account`).
  - Removed admin conditional branching logic; automatically reroutes any admin target URLs to `/admin/login`.
  - Added a clean footer link allowing administrative team members to easily navigate to the Admin Portal.
* **Admin Layout Guards (`src/app/admin/layout.tsx`)**:
  - Updated unauthenticated `/admin/*` route interception to redirect to `/admin/login?next=...` instead of `/auth`.
  - Updated admin sign out handler to return to `/admin/login`.
  - Allowed `/admin/login` and `/admin/unauthorized` to render standalone without sidebar navigation.
* **Team Invitation Acceptance (`src/app/invite/[token]/page.tsx`)**:
  - Updated unauthenticated and account-switching redirects for invitees to use `/admin/login`.

## Why
To provide clear separation of concerns between customer shopping accounts and administrative/team member access, preventing confusion and enhancing administrative security and UX.

## Files Touched
* `src/app/admin/login/page.tsx`
* `src/app/admin/layout.tsx`
* `src/app/auth/page.tsx`
* `src/app/invite/[token]/page.tsx`
* `docs/changes/2026-09-02-separate-admin-and-user-login.md`

## Commit Message
```
feat: separate admin login portal and customer authentication

- Create dedicated admin login portal at /admin/login with dark console aesthetic
- Add instant admin session and organization membership verification on login
- Redirect unauthenticated /admin routes to /admin/login instead of /auth
- Streamline /auth for customer shopping accounts, magic codes, and OAuth
- Update team invitation sign-in redirection to use /admin/login
```
