# Project Screenshots: Architecture, Implementation, and Operations

This document explains the end-to-end feature that generates website screenshots for projects, stores them in the database, serves them via an API route, and displays them in project cards.

## Overview
- Generate screenshots with Playwright after a project’s sandbox URL is available.
- Compress to a lightweight thumbnail with Sharp (JPEG) to keep DB size reasonable.
- Store the bytes directly in Postgres on `Project` using Prisma `Bytes`.
- Serve bytes via a Next.js API route with caching headers and a fallback.
- Render screenshots in the UI (`ProjectCard` and project list).

## High-Level Flow
1. User creates a project → Agent builds and deploys to a temporary sandbox (E2B).
2. Once the `Fragment` with `sandboxUrl` is saved, the Inngest function captures a screenshot.
3. The screenshot is compressed and stored in Postgres (`Project.screenshot`, `Project.screenshotMime`).
4. UI references `/api/projects/:id/screenshot` as the image source.
5. API route streams bytes with HTTP caching to reduce DB reads.

## Data Model (Prisma)
We added two optional fields to `Project`:

```prisma
model Project {
  id             String    @id @default(uuid())
  name           String
  userId         String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  messages       Message[]
  screenshot     Bytes?
  screenshotMime String?
}
```

- `screenshot`: The compressed thumbnail bytes (JPEG recommended).
- `screenshotMime`: The content type (e.g., `image/jpeg`).

Migration: run `npx prisma migrate dev --name add_project_screenshot_fields` (already executed) and ensure Prisma Client is regenerated.

## API Route (Streaming the Image)
File: `src/app/api/projects/[projectId]/screenshot/route.ts`
- Fetches `screenshot`, `screenshotMime`, and `updatedAt` for the given project.
- Returns a small transparent SVG placeholder if no screenshot exists.
- Sends `Content-Type`, `Cache-Control`, and `ETag` headers.
- Example usage in the UI: `/api/projects/<projectId>/screenshot`.

Behavior highlights:
- Cache headers: `public, max-age=3600, s-maxage=3600`.
- Weak ETag based on `updatedAt` and byte length for basic cache validation.

## Background Capture (Inngest + Playwright + Sharp)
File: `src/inngest/functions.ts`
- After saving the `Fragment` with `sandboxUrl`, we run a capture step.
- Uses dynamic imports for `playwright` and `sharp` at runtime.
- Flow:
  - Launch Chromium with `--no-sandbox`.
  - Navigate to the sandbox URL with `waitUntil: "networkidle"`.
  - Optional small delay to allow CSS/animations to settle.
  - `page.screenshot({ fullPage: true, type: "png" })`.
  - Sharp resize to width ≈ 1200px, `jpeg({ quality: 70 })`.
  - Store bytes in `Project.screenshot` with `screenshotMime = "image/jpeg"`.
- Failures are ignored (UI falls back to placeholder), so the main flow is resilient.

Runtime requirements:
- `playwright` dependency installed.
- Chromium browser installed: `npx playwright install chromium`.
- `sharp` installed on the runtime.

## Manual Backfill (tRPC)
File: `src/modules/projects/server/procedures.ts`
- Procedure: `projects.captureScreenshot`
- Input: `{ projectId: string }`
- Finds latest `Fragment` with `sandboxUrl` for the project, captures, compresses, and saves screenshot bytes to DB.
- Useful for retrofitting existing projects or refreshing a bad capture.

## UI Integration
### Project grid/list
- `src/components/project-card.tsx`
  - Card layout dedicates the main area to the image using `object-contain` so no content is cropped.
  - Text content (title, preview, metadata) lives below the image area.
  - Card height increased to make previews clearly visible.

- `src/modules/home/ui/components/projects-list.tsx`
  - Uses a small thumbnail (`/api/projects/:id/screenshot`) alongside project info.

Image source across UI:
- Always use the API route (not tRPC) to avoid moving blobs in JSON and to leverage HTTP caching.

## Performance and Sizing
- Target thumbnail size: 100–300KB per project (JPEG ~70 quality at ~1200px width).
- DB vs Storage tradeoff: Storing small thumbnails in DB is acceptable; avoid full-resolution images.
- API route sends proper caching headers; consider CDN caching in production.

## Operations
- Dependencies: `playwright`, `sharp`.
- Browser binaries: `npx playwright install chromium`.
- Prisma:
  - Migrations synced; Prisma Client generated to `src/generated/prisma`.
- Inngest runtime must allow Chromium with `--no-sandbox`.
- Monitoring:
  - Add logging/metrics to the capture step if you need visibility into failures/timeouts.

## Troubleshooting
- Image 404/placeholder:
  - No screenshot stored yet; trigger `projects.captureScreenshot`.
  - Verify the Inngest flow ran and DB fields are populated.
- Runtime error: `playwright` not found / browser missing:
  - Ensure dependencies are installed in the environment.
  - Ensure `npx playwright install chromium` ran in the runtime.
- `sharp` issues on certain environments:
  - Use prebuilt binaries (default) or ensure proper libc is available.
- Performance issues / slow API responses:
  - Confirm caching headers are honored.
  - Consider adding a CDN in front of the API route.

## Security Considerations
- API route exposes only image bytes; no user secrets.
- Validate `projectId` access if you later restrict visibility to authenticated users. (Currently public preview is fine for community grid; add auth if needed.)
- Avoid reading untrusted external URLs; we only screenshot our own sandbox.

## Future Improvements
- Progressive enhancement: generate a tiny blur placeholder (Base64) for better perceived loading.
- Error telemetry: capture/track failures with Sentry or logs.
- Scheduled refresh: periodic re-capture if content changes.
- Multi-size thumbnails: generate small/medium for different breakpoints.
- Move to object storage if volume grows or you need high-res previews.
- Add `screenshotUpdatedAt` to `Project` and derive a stronger ETag from a hash of bytes.

## Quick Commands Reference
- Install deps: `npm i sharp playwright`
- Install browser: `npx playwright install chromium`
- Migrate DB: `npx prisma migrate dev --name add_project_screenshot_fields`

## Files Touched
- Prisma schema: `prisma/schema.prisma`
- API route: `src/app/api/projects/[projectId]/screenshot/route.ts`
- Inngest function: `src/inngest/functions.ts`
- tRPC procedures: `src/modules/projects/server/procedures.ts`
- UI cards: `src/components/project-card.tsx`, `src/modules/home/ui/components/projects-list.tsx`

---
This implementation favors simplicity (DB-stored thumbnails) and a strong UX (visible previews) with a clear path to scale (external storage, CDN) if needed.


