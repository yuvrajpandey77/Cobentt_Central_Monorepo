## Agent-7 Tools: Integration, Prompts, Fixes, and Commands

This document summarizes the latest Agent-7 tools work: the system prompt, Inngest integration, tools, utilities, fixes, and how to run and trigger the agent.

---

## Overview
- Added a production-grade coding agent powered by `@inngest/agent-kit` and `@e2b/code-interpreter`.
- Integrated Inngest function to orchestrate an agent network with sandboxed code execution.
- Introduced a strict system prompt enforcing file safety, Shadcn/Tailwind usage, and a termination contract via `<task_summary>`.
- Implemented tools: `terminal`, `createOrUpdateFiles`, and `readFiles` with robust error handling and state persistence.
- Captured agent summaries and returned sandbox URL and written files.

---

## Key Files Added/Updated
- New: `src/prompt.ts` — Canonical system prompt for the coding agent.
- Updated: `src/inngest/functions.ts` — Agent setup, tools, network, and main function.
- Updated: `src/inngest/utils.ts` — Sandbox connector and assistant message helpers.
- Existing: `src/inngest/client.ts` — Inngest client with app id.
- Existing: `src/app/api/inngest/route.ts` — Exposes the Inngest HTTP handler in Next.js.
- Updated: `package.json` — Dependencies for agent-kit, e2b sandbox, Inngest, Zod.

---

## System Prompt (src/prompt.ts)
- Role: Senior engineer working in a sandboxed Next.js 15 environment.
- Enforced environment & file rules:
  - Use `createOrUpdateFiles` for file writes, `readFiles` for reads, and `terminal` for installs/commands.
  - Do not modify `package.json` directly; install deps via terminal with `--yes`.
  - Styling strictly via Tailwind + Shadcn UI; import `cn` from `@/lib/utils`.
  - Never start/stop dev server inside the sandbox; it’s assumed running.
- Output contract: Must end with a `<task_summary>` block; captured into agent state.

---

## Inngest Integration
- Client: `src/inngest/client.ts`
  - `new Inngest({ id: "COGERPHERE_BETA0.1" })`.
- HTTP handler: `src/app/api/inngest/route.ts`
  - `serve({ client: inngest, functions: [CogerphereAgent] })` with `GET | POST | PUT`.
- Function: `src/inngest/functions.ts`
  - Id: `COGERPHERE`, Event: `test/Cogerphereai`.
  - Flow:
    1. Create an E2B sandbox and capture `sandboxId`.
    2. Spin up a `createAgent` with model `openai({ model: "gpt-5-nano" })` and system `PROMPT`.
    3. Register tools (`terminal`, `createOrUpdateFiles`, `readFiles`).
    4. Capture `<task_summary>` in `lifecycle.onResponse` to short-circuit routing.
    5. `createNetwork({ agents: [CogerphereCodeAgent], maxIter: 15 })` with router that stops once summary exists.
    6. `network.run(event.data.value)` — the agent instruction is passed via `event.data.value`.
    7. Expose sandbox URL via `sandbox.getHost(3000)` and return `{ url, title, files, summary }`.

---

## Tools
- terminal
  - Input: `{ command: string }`.
  - Captures `stdout` and `stderr` via E2B stream callbacks.
  - Returns `result.stdout`; on error, returns a combined error with traces.
- createOrUpdateFiles
  - Input: `{ files: { path: string; content: string }[] }`.
  - Writes files inside the sandbox; persists written files in `network.state.data.files` for later return.
- readFiles
  - Input: `{ files: string[] }`.
  - Reads files and returns a JSON stringified array of `{ path, content }`.

---

## Utilities and Error-Handling Fixes (src/inngest/utils.ts)
- `getSandbox(sandboxId)` uses `Sandbox.connect` for stable, reusable sandbox interactions.
- `lastAssistantTextMessageContent(result)`
  - Finds the last assistant message using `findLastIndex`.
  - Handles both string content and multipart content (joins parts) to robustly extract text.
- `functions.ts` improvements
  - Consistent error reporting for terminal/tool handlers with preserved stdout/stderr.
  - `parameters` schemas cast as `AnyZodType` to satisfy agent-kit tooling generics.
  - Summary caching in network state to deterministically end the loop once `<task_summary>` appears.

---

## Dependencies and Scripts (package.json)
- Added/updated dependencies:
  - `@inngest/agent-kit`, `@e2b/code-interpreter`, `inngest`, `zod`.
  - Next.js 15.5, React 19.1, Prisma 6.x (already configured), Tailwind 4, Radix & Shadcn UI stack.
- Scripts:
  - `dev`: `next dev --turbopack`
  - `build`: `next build --turbopack`
  - `start`: `next start`

---

## Environment Variables
- Required for local runs:
  - `E2B_API_KEY` — required by `@e2b/code-interpreter` for sandbox create/connect.
  - `OPENAI_API_KEY` — used by `@inngest/agent-kit` `openai()` provider.
- Optional for Inngest cloud usage:
  - `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` (if sending via Inngest Cloud instead of local handler).

---

## Runbook: Install, Run, Trigger
1) Install packages (if not already present)
```bash
npm i @inngest/agent-kit @e2b/code-interpreter inngest zod --yes
```

2) Start the Next.js dev server
```bash
npm run dev
```

3) Trigger the Inngest function (local handler)
- Endpoint: `http://localhost:3000/api/inngest`
- Body: an event with name `test/Cogerphereai` and agent instruction in `data.value`.
```bash
curl -X POST "http://localhost:3000/api/inngest" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test/Cogerphereai",
    "data": { "value": "Create a dashboard page with Tailwind and Shadcn UI" }
  }'
```

4) Expected behavior
- The agent runs up to 15 iterations, uses tools to install packages, create files, and read files.
- On completion, it emits `<task_summary>...` which is stored in `network.state.data.summary`.
- The function returns metadata `{ url, title, files, summary }`. The sandbox URL points to port 3000 of the sandbox app.

---

## Notes & Known Considerations
- The system prompt forbids starting/stopping the dev server and mandates all file changes via the provided tools.
- Always import `cn` from `@/lib/utils` to avoid invalid paths.
- Tools use defensive error handling; terminal outputs include both stdout and stderr for debugging.
- Ensure the E2B sandbox template `cogerphereailabsbeta1` exists and is accessible to your API key.
- Event payloads must include `data.value` which is passed to `network.run(...)` as the agent instruction.

---

## Revision
- Initial Agent-7 tools integration and documentation for the COGERPHERE beta 0.1.
