### Part 8 — Message Saving, Database Schema, and Processing Flow

This document explains the end-to-end message saving flow, the database schema powering it, how the Inngest agent integrates, and what to consider when updating the schema and server code. It covers the latest changes implemented in the following files:

- `prisma/schema.prisma`
- `prisma/migrations/20250908053451_initial_migration/migration.sql`
- `src/lib/db.ts`
- `src/modules/messages/server/procedures.ts`
- `src/trpc/routers/_app.ts`
- `src/app/api/inngest/route.ts`
- `src/inngest/functions.ts`

---

## Overview

- We introduced a relational schema with `Message` and `Fragment` models.
- We added a tRPC `messages` router to create and list messages.
- We wired Inngest to run the Cogerphere agent after a user message is created.
- The agent saves an assistant result message and an attached `Fragment` (files + sandbox URL) in a single nested write.

---

## Data Model

### Enums

```prisma
enum MessageRole {
  USER
  ASSISTANT
}

enum MessageType {
  RESULT
  ERROR
}
```

### Models

```prisma
model Message {
  id        String      @id @default(uuid())
  content   String
  role      MessageRole
  type      MessageType
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
  fragments Fragment?
}

model Fragment {
  id         String   @id @default(uuid())
  messageId  String   @unique
  message    Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  sandboxUrl String
  title      String
  files      Json
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

Key points:

- One-to-one: `Message` ↔ `Fragment` via `Fragment.messageId` (unique). A `Message` can have at most one `Fragment`.
- Cascade delete: Deleting a `Message` also deletes its `Fragment`.
- `Fragment.files` stores a JSON object containing file paths and contents produced by the agent.

Migration DDL snapshot:

```sql
-- Enums
CREATE TYPE "public"."MessageRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "public"."MessageType" AS ENUM ('RESULT', 'ERROR');

-- Tables
CREATE TABLE "public"."Message" (
  "id" TEXT PRIMARY KEY,
  "content" TEXT NOT NULL,
  "role" "public"."MessageRole" NOT NULL,
  "type" "public"."MessageType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "public"."Fragment" (
  "id" TEXT PRIMARY KEY,
  "messageId" TEXT NOT NULL,
  "sandboxUrl" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "files" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX "Fragment_messageId_key" ON "public"."Fragment"("messageId");

ALTER TABLE "public"."Fragment"
  ADD CONSTRAINT "Fragment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## Prisma Client Singleton

`src/lib/db.ts` ensures a single Prisma client instance across reloads in development and a single instance in production.

```ts
import { PrismaClient } from '../generated/prisma'

const globalForPrisma = global as unknown as {  
    prisma: PrismaClient
}

const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

---

## API Layer (tRPC) — Messages Router

`src/modules/messages/server/procedures.ts`

```ts
export const messagesRouter = createTRPCRouter({
  getMany: baseProcedure.query(async () => {
    const messages = await prisma.message.findMany({
      orderBy: { updatedAt: 'desc' },
      // include: { fragments: true }, // enable if you need files/sandbox URL
    })
    return messages
  }),

  create: baseProcedure
    .input(z.object({ value: z.string().min(1, { message: 'Message is required' }) }))
    .mutation(async ({ input }) => {
      const createdMessage = await prisma.message.create({
        data: { content: input.value, role: 'USER', type: 'RESULT' },
      })

      await inngest.send({
        name: 'Cogerphereai/runAgent',
        data: { value: input.value },
      })

      return createdMessage
    }),
})
```

Notes:

- `getMany` returns messages sorted by latest update; include `fragments` when the client needs the file bundle.
- `create` immediately persists the user message, then emits an Inngest event to run the agent.
- The `type` is currently set to `RESULT` for user messages; if you later add an explicit `INPUT` type, update the enum and all write paths accordingly.

Router registration:

```ts
// src/trpc/routers/_app.ts
export const appRouter = createTRPCRouter({
  messages: messagesRouter,
})
export type AppRouter = typeof appRouter
```

---

## Inngest Integration

### Next.js API Route

`src/app/api/inngest/route.ts` exposes the Inngest handler and registers functions.

```ts
import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { CogerphereAgent } from '@/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [CogerphereAgent],
})
```

### Agent Orchestration and Save Logic

`src/inngest/functions.ts` defines the `CogerphereAgent` function. It:

- Spawns a sandbox with E2B for running commands.
- Creates an agent with tools: `terminal`, `createOrUpdateFiles`, `readFiles`.
- Iterates until it obtains a `<task_summary>` in the agent output.
- Builds a `sandboxUrl` for previewing the generated project.
- Saves the outcome to the database via Prisma.

Key save step (success and error paths):

```ts
await step.run('save-result', async () => {
  if (isError) {
    return await prisma.message.create({
      data: {
        content: 'Something went wrong , please try again',
        role: 'ASSISTANT',
        type: 'ERROR',
      },
    })
  }

  return await prisma.message.create({
    data: {
      content: result.state.data.summary,
      role: 'ASSISTANT',
      type: 'RESULT',
      fragments: {
        create: {
          sandboxUrl,
          title: 'Fragment',
          files: result.state.data.files,
        },
      },
    },
  })
})
```

This uses Prisma’s nested writes to create the `Message` and its `Fragment` atomically in one transaction.

---

## End-to-End Flow

1. Client calls `messages.create` with `value` (the user prompt).
2. Server writes a `Message` row with `role = USER` and `type = RESULT` and returns it.
3. Server emits Inngest event `Cogerphereai/runAgent` with the same value.
4. Inngest runs `CogerphereAgent`, which executes tools and produces `summary` and `files`.
5. The agent saves an assistant `Message` (`role = ASSISTANT`) and:
   - On success: `type = RESULT` with a nested `Fragment` containing `sandboxUrl`, `title`, and `files`.
   - On failure: `type = ERROR` with an error message.
6. Client can later call `messages.getMany` (optionally including `fragments`) to display timeline and artifacts.

---

## Querying Examples

- Fetch messages with fragments:

```ts
const messagesWithFragments = await prisma.message.findMany({
  orderBy: { updatedAt: 'desc' },
  include: { fragments: true },
})
```

- Fetch only assistant results:

```ts
const assistantResults = await prisma.message.findMany({
  where: { role: 'ASSISTANT', type: 'RESULT' },
  orderBy: { createdAt: 'desc' },
})
```

---

## Updating the Schema Safely

When changing the data model:

- Update `prisma/schema.prisma` and run:

```bash
npx prisma migrate dev --name <describe_change>
npx prisma generate
```

- If you add enum values (e.g., an `INPUT` type):
  - Update `MessageType`/`MessageRole`.
  - Adjust all create/update codepaths (`messages.create`, agent save step).
  - Migrate existing rows if needed (set defaults or backfill).

- If you need multiple fragments per message:
  - Change `Message.fragments Fragment?` to `Fragment[]`.
  - Remove the `@unique` constraint on `Fragment.messageId` and update relations.
  - Update reads to handle arrays and writes to use `createMany` or repeated `create`.

- Consider indexes for common filters/sorts (e.g., `createdAt`, `updatedAt`, `role`, `type`).

- Maintain cascade semantics intentionally. If you remove `onDelete: Cascade`, ensure you clean up orphans.

---

## Updating Server Code

Keep these in sync when changing the schema:

- Zod validators in `messages.create` input/output.
- Prisma write/read shapes (`include`, `select`, `where` conditions).
- Event names and payloads (`Cogerphereai/runAgent`).
- Client expectations for returned fields (especially when adding `fragments`).

Tips:

- Prefer nested writes (`create`, `createMany`) within transactions for atomicity.
- Use `select` to limit payload size when returning large `files` JSON.
- Validate payload sizes if `files` can be large to avoid DB bloat.

---

## Operational Considerations

- Configure `DATABASE_URL` (PostgreSQL) in environment variables.
- Use `prisma studio` to inspect data locally:

```bash
npx prisma studio
```

- For clean rebuilds locally:

```bash
npx prisma migrate reset --force
npx prisma migrate dev
npx prisma generate
```

- In production CI/CD, prefer `prisma migrate deploy`.

---

## Error Handling & Observability

- The agent uses a guard `isError` to decide between `ERROR` vs `RESULT` messages.
- Log failures with enough context to debug tool execution, but avoid logging sensitive `files` content in production logs.
- Consider surfacing `fragments` on the UI behind an explicit toggle due to payload size.

---

## Common Pitfalls

- Forgetting `npx prisma generate` after schema edits (types become stale).
- Changing enum values without updating codepaths and existing rows.
- Returning large `files` JSON to the client by default; prefer selective `include`/`select`.
- Breaking one-to-one relation by removing `@unique` without updating queries.

---

## Where to Change What

- Database schema: `prisma/schema.prisma` → run migrations and generate.
- tRPC endpoints: `src/modules/messages/server/procedures.ts`.
- Router registration: `src/trpc/routers/_app.ts`.
- Inngest function save logic: `src/inngest/functions.ts` (both success and error branches).
- Inngest routing endpoint: `src/app/api/inngest/route.ts`.
- Prisma client setup: `src/lib/db.ts`.

---

## Future Enhancements (Optional)

- Add `MessageType.INPUT` to distinguish user inputs.
- Add pagination (`cursor`, `take/skip`) to `getMany` for large histories.
- Add indexes on `updatedAt`, `role`, `type` for faster queries.
- Store additional agent metadata (model, tokens used) in a new related table.
- Support multiple `Fragment` records per assistant message to track iterations.

---

If you need guidance adapting this flow for new message types or additional relations, update the enum(s), adjust the Prisma models, run a migration, and then update the tRPC handlers and the Inngest save logic accordingly.


