# Cloud computer, personal agent tasks, and Goals

This document records everything built in this change: how it works, what
protects the user, how it was tested, and what to do to deploy it. Read it
before you deploy.

Repositories touched:

- **Web** (`Cobentt_Central_Monorepo_WEB+LANDING`, branch `Staging`): the cloud
  computer API, the personal task runner, the Inngest fix, middleware, tests, and this doc.
- **Mobile and agent-core** (`cobentt`, branch `Staging`): the default
  cloud computer connection, the Goals screen, and goal logic with tests.

---

## 1. What the user gets

Every signed-in user now has a **Cobentt cloud computer** by default. Nothing
to set up, no server to run, no key to paste.

| Surface | What it does now |
|---|---|
| **Apps → Computer → Terminal** | Runs a command in `/workspace`. 30-second limit, output capped at 8,000 characters, history kept for the last 50 commands. |
| **Apps → Computer → Files** | Browse, open, edit and create folders and text files in `/workspace`. |
| **Apps → Computer → Browser** | Opens a public web page and shows its text (server-side read). Not an interactive browser. |
| **Activity** | Start background tasks. Each task plans steps, runs them in the computer, asks for approval when a step is risky, and reports a summary. |
| **Goals** | Notion-style goal pages: filters, due dates, notes, editable steps, reordering. Stored on the phone. |

A user's own agent server still works. If a user saves their own server
address, the app uses that instead of the cloud computer.

---

## 2. Architecture

```
Mobile app                        Web app (Vercel / cobentt.cogerphere.com)
──────────                        ─────────────────────────────────────────
ServerContext                     /api/cloud-computer/[...path]   (route)
  └─ CLOUD_COMPUTER_URL  ───────▶   └─ handleCloudComputer()      (router)
     Clerk token per request           ├─ auth: Clerk verifyToken (bearer)
                                       ├─ CloudComputerService  (computer ops,
                                       │   history, files, tasks)
                                       └─ e2bBackend  ──────────▶ E2B microVM
                                                                 /workspace
Inngest  ◀── personal/run-task ── handlers (create task)
  └─ personal-run-task (durable)
       plan → approval (if risky) → run steps → summarise
       └─ writes task JSON to /workspace/.cobentt/tasks/<id>.json
```

### Why there is no new database table

State lives where the work happens:

- The **computer's state** (command history, task records) is in
  `/workspace/.cobentt/` inside the user's own E2B sandbox. It is hidden from
  file listings and cannot be written to by the user's file editor.
- A user's computer is found by **sandbox metadata**: an owner tag (a SHA-256
  of the Clerk user id, never the raw id) plus a `kind`. There is one running
  computer per user.

The trade-off: task history lasts as long as the computer does. When the
computer is stopped or expires after 15 idle minutes, its tasks and history go
with it. If that is not acceptable, add a `CloudComputer` table in Prisma and
move task records into it. The router is structured so that change touches one file.

---

## 3. Files

### Web repo (`Cobentt_Central_Monorepo_WEB+LANDING`)

| File | Purpose |
|---|---|
| `src/lib/cloud-computer/backend.ts` | Interfaces (`ComputerBackend`, `Computer`) and the **E2B adapter**: create, connect, find by metadata, run, read, write, list, make folder, extend timeout, kill. |
| `src/lib/cloud-computer/service.ts` | Computer operations for one user: start, stop, snapshot, exec with history, file operations, and the rule that only "not found" means "gone". |
| `src/lib/cloud-computer/handlers.ts` | HTTP router. Implements every route the mobile app already calls on an agent server, plus the task and approval routes. |
| `src/lib/cloud-computer/tasks.ts` | Task records, plan parsing (strict JSON), approval hash, event log. |
| `src/lib/cloud-computer/risk.ts` | Command risk rules. Decides which agent-proposed commands need approval. |
| `src/lib/cloud-computer/paths.ts` | Keeps every path inside `/workspace`. |
| `src/lib/cloud-computer/network.ts` | Public-URL check for the browser: blocks private, loopback, link-local and metadata addresses, and non-standard ports. |
| `src/lib/cloud-computer/browse.ts` | Reads a public page, follows only public redirects, caps body size, extracts title and text. |
| `src/lib/cloud-computer/output.ts` | Output caps. |
| `src/lib/cloud-computer/auth.ts` | Clerk bearer-token verification. |
| `src/lib/cloud-computer/index.ts` | Production wiring (E2B backend, rate limits, Inngest sender). |
| `src/lib/cloud-computer/cloud-computer.test.ts` | 27 tests (see section 7). |
| `src/app/api/cloud-computer/[...path]/route.ts` | Next.js route (GET, POST). |
| `src/inngest/personal-tasks.ts` | The task runner, `personal-run-task`. |
| `src/inngest/functions.ts` | **Fix:** `Cobentt/runAgent` now requires a `userId` and always scopes message history to it. |
| `src/app/api/inngest/route.ts` | Registers `runPersonalTask`. |
| `src/middleware.ts` | `/api/cloud-computer(.*)` is public to Clerk middleware. The route verifies the token itself. |
| `scripts/cloud-computer/live-smoke.ts` | Live E2B test (creates a real computer, then stops it). |
| `package.json` | New script: `npm run test:cloud`. |
| `docs/CLOUD_COMPUTER_AND_TASKS.md` | This document. |

### Mobile and agent-core (`cobentt`)

| File | Change |
|---|---|
| `apps/mobile/src/config/agent.ts` | `CLOUD_COMPUTER_URL` (default `https://cobentt.cogerphere.com/api/cloud-computer`, override with `EXPO_PUBLIC_COMPUTER_URL`). |
| `apps/mobile/src/context/ServerContext.tsx` | With no saved server, connects to the cloud computer once the user is signed in. Retries every 5 s. Sends a **fresh Clerk token on every request** (`cloudFetch`). A saved custom server takes priority. |
| `apps/mobile/src/context/AgentContext.tsx` | Exposes `renameGoal`, `setGoalDue`, `setGoalNotes`, `renameStep`, `moveStep`. |
| `apps/mobile/src/screens/GoalsScreen.tsx` | Rewritten: filter tabs with counts, goal rows with due date and progress, a full goal page with title, status, due date, notes, editable steps, reordering and delete. |
| `packages/agent-core/src/goals.ts` | `notes` field; pure functions for editing, filtering, sorting, overdue checks and quick due dates. |
| `packages/agent-core/src/goals.test.ts` | 10 tests. |
| `packages/agent-core/src/server.ts` | Provider type now includes `"e2b"`. |

---

## 4. API

All routes sit under `/api/cloud-computer`. Everything except `GET /health`
needs `Authorization: Bearer <Clerk session token>`. Missing or invalid tokens get 401.

| Method and path | What it does |
|---|---|
| `GET /health` | Public. Returns `{status:"ok", mode:"live"}`. |
| `POST /session` | Echoes the caller's valid token. |
| `GET /workspace` | Workspace summary. Includes `actions`: tasks waiting for approval. |
| `GET /agent` | Tasks for this computer. |
| `POST /agent/tasks` | Creates a task. Starts the computer if needed. Sends `personal/run-task`. Rate limit 10 per minute. |
| `GET /agent/tasks/:id` | Task detail with events. |
| `POST /agent/tasks/:id/control` | `pause`, `resume`, `cancel` or `retry`. Resume and retry send the event again. |
| `POST /agent/tasks/:id/input` | Returns 409. Tasks never ask for free-text input in this version. |
| `POST /actions/:id/decide` | Approve or deny a task's plan. Body must include the **exact plan hash** shown. Otherwise 409. |
| `GET /computer` | Snapshot: status, network setting, recent commands. |
| `POST /computer/start` · `/stop` | Start or stop the computer. |
| `POST /computer/commands` | Runs a Terminal command directly (the user is the operator). Rate limit 60 per minute. |
| `GET /computer/files?path=` | Lists `/workspace` (or a folder inside it). |
| `POST /computer/files/read` · `/write` · `/mkdir` | File operations, confined to `/workspace`. `.cobentt` is protected from writes. |
| `POST /browsers`, `GET /browsers/:id`, `GET /browsers/:id/read`, `POST /browsers/:id/navigate` · `/close` · `/reopen` | Public-page reads. The session id is the URL, base64url-encoded, so no server state is needed. |
| `POST /google/connect` | 501. Google accounts are not on the cloud computer yet. |

Error bodies: `{ "error": { "message": "…" } }`. Status 400 for bad input,
401 unauthorised, 404 not found, 409 conflict, 429 rate limited, 500 generic.
Internal errors are logged without secrets and never returned to the client.

---

## 5. The personal task runner

`src/inngest/personal-tasks.ts`, Inngest function id `personal-run-task`,
triggered by `personal/run-task`.

1. **Gate.** Loads the task. Stops if it is cancelled, paused or already succeeded.
2. **Plan (once).** One model call, using the user's own key through
   `resolveByokCredential`. The reply must be JSON: up to 8 steps, each with a
   title and one command. The plan is saved, so a retry never plans again.
3. **Approval (only when needed).** Any step that `risk.ts` flags puts the
   task in `waiting_approval`. The function waits up to 24 hours for
   `personal/approval.decided`, matched on `taskId`. It proceeds only if the
   decision is `approve` **and** its hash equals the hash of the stored plan.
   A changed plan can never run on an old approval.
4. **Run.** Each step is its own durable Inngest step. The task status is checked
   before every step, so pause and cancel take effect at the next step. Steps
   that already succeeded are skipped on resume.
5. **Summarise.** One model call writes a short summary from the step outputs. The task is `succeeded`.

Any unexpected error marks the task `failed` with a message. The run is
limited to 2 concurrent runs per user (Inngest concurrency key on `userId`).

Model calls use the default model. With a saved OpenRouter key that is
OpenRouter Fusion, which costs more per call than the free router. A task makes
exactly two model calls: one to plan and one to summarise. Steps run commands
without calling the model.

---

## 6. Security model

### 6.1 Isolation

- Every computer is an **E2B microVM** (Firecracker). Code runs there, never in
  the web or API process.
- The template (`E2B_COMPUTER_TEMPLATE`, default `cogerphereailabsbeta1`) is
  the same one the web builds already use.
- A computer is killed after **15 idle minutes**. Each request that uses it
  extends that time. The Hobby plan caps lifetime at 1 hour.
- Commands run in `/workspace` with a **30-second** limit. Output is capped and
  marked as truncated.

### 6.2 Network

- Default: **enabled** (`COMPUTER_NETWORK` unset). The agent can install
  packages and fetch pages. Set `COMPUTER_NETWORK=disabled` to turn it off for
  everyone. A per-user setting is not built yet (section 9).
- Browser reads happen on the server (`browse.ts`), not inside the computer.
  Pages get no cookies, logins or scripts. The URL check blocks loopback,
  private, link-local, carrier-NAT and metadata addresses, every resolved
  address is checked, and only ports 80 and 443 are allowed.

### 6.3 Approvals (agent-proposed commands only)

`risk.ts` flags a command when it:

- uses `sudo` or switches user,
- deletes recursively (`rm -r…`),
- changes the machine (`mkfs`, `dd`, `shutdown`, `mount`…),
- changes permissions recursively,
- pipes a download into a shell,
- connects to another host (`ssh`, `scp`, `nc`, `rsync`…),
- stops processes (`kill`, `pkill`, `killall`),
- changes services or accounts (`systemctl`, `useradd`…),
- decodes or evaluates code (`eval`, `base64 -d`…),
- uses a `../` path,
- uses an absolute path outside `/workspace` or `/tmp`.

A flagged plan needs the user's approval for **every** command in it, shown
with the reasons. The user's own Terminal commands are **not** checked, because
the user is the operator. These rules are a guardrail. The microVM is the real boundary.

### 6.4 Paths and files

- All paths resolve inside `/workspace`. `..`, NUL bytes and look-alikes such
  as `/workspace2` are rejected.
- `/workspace/.cobentt` (history and task records) cannot be written through
  the file API, and is hidden from listings.

### 6.5 Authentication and secrets

- Every route except `/health` verifies the **Clerk session token** itself
  (`verifyToken`). The middleware is public for this prefix, so the route is the
  only gate. Tests cover missing, malformed and unverifiable tokens.
- The mobile app fetches a **fresh** Clerk token for each request. Tokens are
  never stored.
- Sandbox metadata holds an **owner hash**, not the raw user id.
- BYOK keys are decrypted only inside `resolveByokCredential`, used for the
  request, and never returned or logged.

### 6.6 Abuse and cost

- Rate limits (per user, per minute): tasks 10, terminal commands 60.
- One computer per user (found by metadata, reused).
- Task runs: 2 concurrent per user.
- Approval waits last at most 24 hours, then the task is cancelled.
- Output caps on command results and task summaries.

### 6.7 Fixed in this change

- **`Cobentt/runAgent` owner scope.** The coding agent's message history
  filtered by owner only when `userId` was present. Without it, it read any
  project's messages. It now throws `NonRetriableError` when `userId` is
  missing and always filters by `project.userId`.
- **Activity copy.** It said the cloud agent was used by default. That is now
  true.

### 6.8 Known limits (not fixed here)

- **Task records live in the computer.** When the computer expires, its tasks are gone.
- **No per-user network setting** yet. Network is global.
- **Browser is read-only.** No clicking, logging in or screenshots.
- **Google is not connected** to the cloud computer. Mail and calendar on the
  computer return empty lists.
- **The Rust API's E2B backend** (`apps/api-rust/src/sandbox/e2b.rs`) is separate
  and not yet tested live. The web cloud computer uses its own adapter, which
  is tested live (section 7).
- **The local agent-server stub** (`tools/local-agent-server`) has no auth and
  listens on the LAN. Dev only.

---

## 7. Testing

### 7.1 What was run

| Suite | Command | Result |
|---|---|---|
| Cloud computer and model rules (web) | `npm run test:cloud` | **27 / 27 pass** |
| Payments (web, pre-existing) | `npm run test:payments` | 35 / 35 pass (re-run for this change, see section 7.3) |
| Agent-core (mobile package) | `npx vitest run` in `packages/agent-core` | **131 / 131 pass** (includes 10 new goal tests) |
| Mobile app | `npx vitest run` in `apps/mobile` | **115 / 115 pass** |
| Type-check (web) | `npx tsc --noEmit` | Pass |
| Type-check (mobile) | `npx tsc --noEmit` | Pass |
| Lint (changed web files) | `npx eslint …` | Pass, no warnings |
| **Live E2B smoke test** | `npx tsx --env-file=.env scripts/cloud-computer/live-smoke.ts` | **Passed** against E2B: start, command, file write and read, listing, second command, stop |
| Mobile preview in browser | `expo start --web` on port 8081, then manual use | Goals screen checked: create goal, set due date, add steps, reorder steps |

The live test found two real bugs, both fixed and retested:

1. The template has **no `/workspace` folder**, so every command failed. Start now creates it.
2. Stopping a computer briefly still listed it, and connecting returned "not found". Only "not found" now counts as gone. Any other error still surfaces, so a retry cannot start a second, billed computer.

### 7.3 Re-run before deploy

Re-run every suite in section 7.1 on the exact commit you deploy. The results
above are for the state of the code when this document was written.

### 7.2 What is NOT tested, and why

- **Real Clerk tokens against the route.** Needs a signed-in session. The
  offline test covers rejection; acceptance is not exercised. Check it on
  staging (section 8).
- **The Inngest task runner end to end.** It needs the Inngest dev server or
  the hosted service with the real event key. The pure parts (plan parsing,
  approval hashing, risk rules, task state) are tested.
- **Mobile cloud connection.** The Expo preview has no Clerk session, so the
  app stays "Computer offline". The Goals screen was checked in the browser.
- **Browser reads against live sites.** The URL and redirect rules are tested
  offline. Fetching a real site was not run.
- **Load and cost.** Not measured.

---

## 8. Deploying

### 8.1 Environment variables (web host, Vercel)

| Variable | Needed for | Value |
|---|---|---|
| `E2B_API_KEY` | Computers and tasks | Already set (builds use it). |
| `E2B_COMPUTER_TEMPLATE` | Optional | Defaults to `cogerphereailabsbeta1`. |
| `COMPUTER_NETWORK` | Optional | `enabled` (default) or `disabled`. |
| `CLERK_SECRET_KEY` | Token check | Already set. |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Task runs | Already set. |

Mobile build: `EXPO_PUBLIC_COMPUTER_URL` (optional). Defaults to
`https://cobentt.cogerphere.com/api/cloud-computer`. Set it if the web app
lives elsewhere.

### 8.2 Steps

1. **Merge to the deploy branch** (`Staging` first, then production, when ready).
2. **Redeploy the web app.** The new route, middleware rule and Inngest function must ship together.
3. **Sync Inngest.** After deploy, sync the app in the Inngest dashboard so
   `personal-run-task` is registered. Confirm it lists in the functions view.
4. **Smoke test on staging, with a real account:**
   - `GET https://<host>/api/cloud-computer/health` returns `{"status":"ok"}`.
   - `GET https://<host>/api/cloud-computer/computer` **without** a token returns 401.
   - Sign in on a phone build. Open Apps → Computer. It should show "stopped",
     then "running" after Start. Run `echo hello`. The output should appear.
   - Create an Activity task such as "list my workspace files". It should move
     through Queued → Working → Finished with a summary.
   - Create a task that needs approval: "delete the folder old". It should
     stop at Needs your approval. Approve it and check that it completes.
5. **Watch logs** for `[cloud-computer]` and Inngest run failures for the first day.
6. **Re-run `npm run test:cloud`** and `scripts/cloud-computer/live-smoke.ts` on
   the deploy branch.

### 8.3 Rollback

- Remove `/api/cloud-computer` from the deploy. The mobile app keeps its
  Computer screen but shows request errors, and nothing else breaks. Goals
  and chat are not affected, since they don't use the endpoint.
- Disabling `personal-run-task` in Inngest stops new task runs. Existing
  computers are unaffected.
- `Cobentt/runAgent` changes are a strict tightening. Roll back only if a
  caller that omits `userId` is found, and fix that caller instead.

---

## 9. Next steps, in order of value

1. A per-user **network** setting, stored in Prisma.
2. Move **task records** into Prisma so they outlive the computer.
3. **Google** on the computer (mail and calendar as read-only first).
4. **Interactive browser** (screenshots and clicks) with an E2B desktop template.
5. Connect the **Rust API's E2B backend** to the same operations, or retire it.
6. **Cost dashboard**: sandbox minutes and model calls per user.

---

## 10. Honest summary

- Built and tested: the cloud computer API, its live E2B behaviour, the task
  runner's pure logic, the mobile default connection, and the Goals screen.
- Not yet proven on a live deploy: Clerk token acceptance on the route, the
  Inngest runner's end-to-end path, and real-site browsing. Section 8.2 covers
  each.
