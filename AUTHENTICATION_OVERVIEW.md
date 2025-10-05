# Authentication Architecture and Security Guide

This document summarizes the authentication work integrated into the app, why it improves security, what to add next, and how to extend the system safely as the app grows.

---

## What We Implemented

- Clerk-based authentication wired into App Router
  - Root provider: `ClerkProvider` mounted in `src/app/layout.tsx` so auth state is available app-wide.
  - Middleware enforcement: `src/middleware.ts` uses `clerkMiddleware` with public routes (`/`, `/sign-in(.*)`, `/sign-up(.*)`, `/api/inngest(.*)`) and protects everything else.
  - tRPC context + guards:
    - `src/trpc/init.ts` builds context from `auth()` and exports:
      - `protectedProcedure`: blocks unauthenticated access (throws `UNAUTHORIZED`).
      - `baseProcedure`: open endpoints (rarely used—prefer `protectedProcedure`).
  - Auth pages:
    - `app/(home)/sign-in/[[...sign-in]]/page.tsx`
    - `app/(home)/sign-up/[[...sign-up]]/page.tsx`
    - Split layout: form left, brand panel right, single shared background image, dark overlay for readability.
  - Header behavior:
    - Signed out: shows “Sign in” + “Sign up” (replaces the old Get Started).
    - Signed in: shows the existing actions and the user menu (`UserControl`).
  - Project creation UX:
    - `ProjectForm` pre-checks auth. If unauthenticated, redirect to `/sign-in` before mutating. Also redirects on tRPC `UNAUTHORIZED` (handles different error shapes).

---

## Why This Is Secure (and Better UX)

- Centralized authorization on the server
  - `protectedProcedure` enforces identity for all sensitive tRPC routes (no client-side bypass possible).
  - Middleware ensures non-public routes are protected on first request—static assets are excluded for performance.
- Tamper‑resistant user identity
  - Clerk SDK handles session tokens, rotation, and device state so we don’t hand-roll crypto or cookies.
- Least-privilege API surface
  - Most endpoints use `protectedProcedure`. `baseProcedure` is reserved for truly public operations only.
- Clear unauthenticated flows
  - Immediate redirect to `/sign-in` in `ProjectForm` avoids wasted network calls and improves UX.
- Consistent UI state
  - `SignedIn` / `SignedOut` controls avoid accidental exposure of privileged UI actions.

---

## Current Security Baseline

- Server-side checks:
  - tRPC procedures validate auth (`protectedProcedure`) and inputs (`zod`).
- Route protection:
  - Middleware gate keeps non-public routes.
- Principle of least privilege:
  - Project queries/mutations tied to `ctx.auth.userId` in Prisma queries.

---

## What We Can Add Next

- Role-based access control (RBAC)
  - Store roles/permissions in DB or Clerk public metadata (e.g., `role: ADMIN|USER`).
  - Add `hasRole("ADMIN")` middleware layer for privileged procedures.
- Organization/Team model
  - Support multi-tenant access with `orgId` scoping across all queries.
  - Tenant isolation via composite keys: `{ userId, orgId }` where applicable.
- Session security
  - Enforce MFA for sensitive actions.
  - Configure session expiry/idle timeouts in Clerk.
- Audit logging
  - Record security-relevant events (sign-in, role changes, failed access) to an append-only log.
- Rate limiting & abuse protection
  - Add per-user/per-IP rate limits on sensitive endpoints (e.g., project creation).
- Content security policy (CSP)
  - Tighten CSP headers to reduce XSS risk (especially on auth pages).
- Secret management
  - Keep secrets in environment-specific stores (CI/CD, cloud provider secrets). Never commit to VCS.

---

## Patterns to Follow When Adding New Pages

- Classify each page as one of:
  1) Public: add path to `isPublicRoute` in `src/middleware.ts`.
  2) Protected (most pages): do nothing—middleware protects by default.
  3) Mixed (public shell, gated data): render shell, fetch data via `protectedProcedure`.

- For any server action / API / tRPC route:
  - Use `protectedProcedure` unless the route is explicitly public.
  - Validate inputs with `zod` (reject early on server).
  - Scope DB queries to `ctx.auth.userId` (and `orgId` in multi-tenant setups).

- For client UI:
  - Use `SignedIn`/`SignedOut` to toggle actions.
  - Avoid leaking private data in the initial HTML—fetch via protected tRPC calls after hydration.

- Redirect strategy
  - For interactive flows (forms/buttons), pre-check auth and redirect to `/sign-in` early.
  - For server components, rely on middleware and `protectedProcedure` to fail fast.

- Error handling
  - On `UNAUTHORIZED`/401, route to `/sign-in` and preserve intent (e.g., via `returnTo` query param) if needed.

---

## Developer Checklist (Quick Reference)

- [ ] Is the route protected by default? If public, add to `isPublicRoute`.
- [ ] Is the server endpoint using `protectedProcedure` (or intentionally public)?
- [ ] Are inputs validated with `zod`?
- [ ] Are queries scoped by `ctx.auth.userId`?
- [ ] Does the UI hide privileged actions for signed-out users?
- [ ] Do interactive flows pre-check auth and redirect?
- [ ] Are errors handled with safe fallbacks (`UNAUTHORIZED` → `/sign-in`)?

---

## File Map (Key Auth Files)

- `src/app/layout.tsx` — mounts `ClerkProvider` (global auth context).
- `src/middleware.ts` — public route matcher + global protection.
- `src/trpc/init.ts` — tRPC context + `protectedProcedure` / `baseProcedure`.
- `src/modules/projects/server/procedures.ts` — protected project CRUD with `userId` scoping.
- `src/app/(home)/sign-in/[[...sign-in]]/page.tsx` — sign-in page.
- `src/app/(home)/sign-up/[[...sign-up]]/page.tsx` — sign-up page.
- `src/components/layout/header.tsx` — auth-aware header actions.
- `src/components/user-control.tsx` — Clerk user menu (theme-aware).
- `src/modules/home/ui/components/project-form.tsx` — pre-check auth + redirect.

---

## Operational Notes

- Environment: Clerk keys are managed via `.env`/deployment secrets. Restart dev server after changes.
- The middleware matcher excludes Next internals and static assets for performance.
- Keep `isPublicRoute` minimal; prefer authenticated pages.

---

By following these patterns—server-enforced auth, least-privilege queries, and UI state that reflects auth—you get a consistent, safe foundation that scales as features are added.
