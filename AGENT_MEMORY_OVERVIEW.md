# Agent Memory – Current Design and Next Steps

This doc summarizes the latest changes related to “agent memory” across the app, how data flows end‑to‑end, why it matters, and what we should do next when iterating on this system.

---

## What Changed Recently (High‑level)

- Message → Memory pipeline hardening
  - Project creation now immediately seeds an initial message from the user so downstream jobs have a concrete starting point.
  - Inngest job orchestration updated in `src/inngest/functions.ts` to reliably receive events for new work (e.g., project bootstrap, agent runs) and to avoid race conditions when saving/reading records.
- Safer server boundaries
  - tRPC `protectedProcedure` is used for all project/message operations; `ctx.auth.userId` is carried through to DB calls to correctly scope all memory to a single user/project.
- Prompt structure cleanup
  - `src/prompt.ts` updated to keep the system and tool contexts clean and consistent so memory items are appended in a predictable shape for the model.
- Persistence model alignment
  - Prisma code in the module routers (`src/modules/*/server/procedures.ts`) ensures we always write memory (messages, fragments) under the correct `userId` and project.

---

## Current Data Flow (E2E)

1) User submits an idea (ProjectForm)
   - A first message is created and saved (scoped to project + user).
   - An Inngest event is emitted with `projectId` and the text.

2) Inngest function(s)
   - Receives the event, runs the agent job, and persists model outputs as new messages and/or fragments.
   - Messages/fragments are always saved with project + user scope.

3) UI reads memory
   - The project view queries messages/fragments for the active project, hydrating the UI from server (tRPC + React Query hydration).

---

## Why This Is Useful

- Repeatability: The agent run can resume with the latest message and project state.
- Traceability: Every generated artifact (message, fragment) is linked to a `projectId` and `userId`.
- Safety: Authorization checks happen server‑side; users only read/write their own memory.

---

## Guardrails We Added

- Server‑enforced auth (tRPC `protectedProcedure`) for all memory mutations and reads.
- Prisma queries constrained by `userId` (and `projectId`) to avoid cross‑tenant leakage.
- Middleware blocks non‑public routes to ensure model artifacts aren’t leaked via pages.

---

## What To Improve Next

- Semantic Memory / Vector Store
  - Add a vector DB (Qdrant/Weaviate/PGVector) for long‑term recall.
  - Index user messages and code fragments by project; retrieve via semantic search per prompt.

- Summarization & Compaction
  - Periodically summarize long threads to reduce context window usage.
  - Maintain a rolling summary per project (short/long forms) and attach to prompts.

- Memory Scopes
  - Short‑term (current run), medium‑term (project session), long‑term (project lifetime).
  - Explicit controls to pin/unpin items (e.g., “key decisions”).

- Observability
  - Structured logs for agent steps and memory writes (message IDs, fragment IDs, latencies).
  - Add a simple admin/debug view to inspect memory timelines by project.

- Consistency Controls
  - Use DB transactions for multi‑write steps (create fragment + message + event).
  - Idempotency keys on Inngest triggers to avoid duplicate writes on retries.

- Safety & Compliance
  - Redaction for sensitive PII before persisting (configurable rules per file/message type).
  - Content moderation gate prior to saving generated content (toggleable per environment).

---

## How To Safely Extend Memory In New Features

- On the Server
  - Prefer `protectedProcedure` for any read/write, validate with `zod`.
  - Always filter by `ctx.auth.userId` and the active `projectId`.
  - Wrap multi‑write operations in a transaction.

- In Jobs (Inngest)
  - Pass `projectId`, `userId` (if available) through the event payload.
  - Make handlers idempotent; log write IDs and return them.

- In the UI
  - Do not serialize private data in the initial HTML.
  - Use tRPC queries (hydrated via server) and React Query on the client.
  - Guard interactive flows: redirect to sign‑in early when unauthenticated.

- Naming & Schema Hygiene
  - Keep message/fragment schemas minimal and explicit; prefer `type` fields for downstream routing.
  - Index fields used in lookups (e.g., `projectId`, `userId`, `createdAt`).

---

## Quick Checklist

- [ ] Route is protected (`protectedProcedure`) and validated (`zod`).
- [ ] Queries scoped by `userId` + `projectId`.
- [ ] Writes are transactional when multi‑step.
- [ ] Events (Inngest) carry the minimal context (ids) and are idempotent.
- [ ] Long threads summarized; vectorized memory behind a feature flag.
- [ ] Logs include message/fragment IDs; no PII in logs.

---

## Key Files

- `src/inngest/functions.ts` — agent job orchestration & event handling.
- `src/modules/*/server/procedures.ts` — tRPC routers (message/project persistence).
- `src/trpc/init.ts` — auth context and `protectedProcedure`.
- `src/prompt.ts` — system prompt and scaffolding for incorporating memory.
- `src/modules/projects/ui/views/project-view.tsx` — memory consumption (messages/fragments) in UI.

By following these conventions, we retain reliable, secure, and auditable agent memory while keeping room for future semantic recall and summarization.
