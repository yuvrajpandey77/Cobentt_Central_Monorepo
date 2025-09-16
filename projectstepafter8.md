## Recent Changes Summary

### Frontend
- Added project creation flow on `src/app/page.tsx`:
  - Input field and submit button using Shadcn UI components (`Input`, `Button`).
  - Uses TanStack Query mutation with tRPC (`trpc.projects.create`) to create a project.
  - On success, navigates to `projects/[projectId]` page and shows errors via `sonner` toasts.

- Added dynamic project page at `src/app/projects/[projectId]/page.tsx`:
  - Server component that reads `projectId` from route params and renders it.

### Backend (tRPC + Prisma + Inngest)
- Introduced `projects` router at `src/modules/projects/server/procedures.ts`:
  - `getMany`: Returns projects ordered by `updatedAt` desc.
  - `create`: Creates a new project with a generated title via `random-word-slugs`, seeds initial user message, and triggers an Inngest event to run the coding agent.

- Enhanced Inngest function `src/inngest/functions.ts` with an AI coding agent workflow:
  - Defines `CogerphereAgent` function responding to `Cogerphereai/runAgent` events.
  - Spins up an E2B sandbox (`@e2b/code-interpreter`) and exposes tools:
    - `terminal`: run commands inside the sandbox.
    - `createOrUpdateFiles`: write/update files inside the sandbox and persist state in the agent network.
    - `readFiles`: read files from the sandbox.
  - Uses `@inngest/agent-kit` to create an agent and network with lifecycle hook capturing `<task_summary>` into persistent state.
  - Persists results to the database via Prisma by creating an `ASSISTANT` message with a `RESULT` type and associated fragment files and a `sandboxUrl`.

- Added Inngest utilities at `src/inngest/utils.ts`:
  - `getSandbox(sandboxId)` helper to connect to E2B sandbox.
  - `lastAssistantTextMessageContent(result)` to extract the last assistant text from agent output.

### Tooling & Templates
- Added sandbox templates under `sandbox-templates/nextjs/`:
  - `e2b.Dockerfile`, `e2b.toml`, and `compile_page.sh` for building and running sandboxed Next.js environments.

### Package Updates
- `package.json` updated (notable deps present):
  - Runtime: `next@15.5.0`, `react@19.1.0`, `react-dom@19.1.0`.
  - Agent/sandbox: `@e2b/code-interpreter`, `@inngest/agent-kit`, `inngest`.
  - Backend: `@prisma/client`, `prisma`.
  - UI/UX: Shadcn + Radix UI, `sonner`, `lucide-react`.
  - Data fetching: `@tanstack/react-query`, `@trpc/*`.
  - Forms/validation: `react-hook-form`, `@hookform/resolvers`, `zod`.

### Notes
- Ensure environment variables for Prisma DB and any Inngest/E2B credentials are configured.
- After pulling these changes, run `npm install` if dependencies changed, and then `npm run dev`.


