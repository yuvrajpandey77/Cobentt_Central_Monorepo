# Full Workspace Migration — cobentt_landing into Main App

## Overview

Three-phase migration that ported cobentt_landing's chat workspace, landing pages, and payment system into the main application, then cleaned up the old customDesigns routes.

---

## Phase 7 — Chat Upgrade

### What Changed

The chat workspace was fully replaced with a new UI from `cobentt_landing/` while adapting its data layer to use the main application's existing tRPC + PostgreSQL infrastructure.

#### Before
- Simple chat UI with basic `MessageBubble` components within `(modes)/chat/`
- Empty chat page with mode pills
- tRPC-backed conversations with SSE streaming
- Chat state managed through `(modes)/layout.tsx` + `SharedInput`

#### After
- Full-featured chat workspace at `/chat`: `Sidebar`, `Composer`, `MessageList`, `SettingsPanel`
- Same data persistence backed by tRPC + PostgreSQL (not localStorage)
- Users log in → all chats intact (same guarantee as website/smart contract projects)
- Thinking traces (reasoning blocks), source citations, web search toggle
- Collapsible sidebar with conversation search, pin/delete
- Settings panel: provider selection, API key management, model params, theme, privacy controls

### Architecture

#### Data Flow
```
User types message
  │
  ├─ tRPC: conversations.create({initialMessage})
  │   → Creates Conversation + Message(USER) in PostgreSQL
  │   → Returns conversation ID
  │
  ├─ SSE: POST /api/chat/[conversationId]/stream
  │   → Backend creates ASSISTANT message (STREAMING)
  │   → Streams tokens via Server-Sent Events
  │   → On completion: marks message COMPLETE in DB
  │
  └─ tRPC cache invalidation
      → conversations.getById refetches from DB
      → UI renders persisted messages
```

#### Database (Prisma)

**Conversation model** (unchanged structure):
```
id         String   @id @default(uuid())
title      String?
userId     String
mode       String   @default("chat")
model      String   @default("openai/gpt-4o-mini")
createdAt  DateTime
updatedAt  DateTime
isPinned   Boolean  @default(false)
isArchived Boolean  @default(false)
messages   Message[]
```

**Message model** (extended with new fields):
```
id              String         @id @default(uuid())
content         String
role            MessageRole    (USER | ASSISTANT)
type            MessageType    (RESULT | ERROR)
status          MessageStatus  (PENDING | STREAMING | COMPLETE | ERROR | CANCELLED)
conversationId  String?        → FK to Conversation
projectId       String?        → FK to Project
parentMessageId String?        → message tree branching
modelUsed       String?
tokenCount      Int?
feedbackValue   Int?
thinking        Json?          ← NEW: thinking trace blocks
sources         Json?          ← NEW: source citations
fragments       Fragment?      (sandbox data for project messages)
```

### New Files Created (Chat)

| File | Purpose |
|------|---------|
| `src/lib/chat-store.tsx` | Adapter hook mimicking cobentt_landing's `useChat()` but backed by tRPC |
| `src/lib/theme-provider.tsx` | Dark-mode-only theme provider for SettingsPanel compatibility |
| `src/components/chat/sidebar.tsx` | Full sidebar: user card, search, thread list, pin/delete, new chat |
| `src/components/chat/composer.tsx` | Message input: starter pills, attach menu, web search toggle, send/stop |
| `src/components/chat/message-list.tsx` | Message rendering: markdown, thinking blocks, source buttons, copy/regenerate/share |
| `src/components/chat/settings.tsx` | Settings panel: hub, appearance, advanced (provider/API key/model/params), privacy |
| `src/app/chat/layout.tsx` | Suspense boundary + ThemeProvider + ChatProvider |
| `src/app/chat/page.tsx` | Full sidebar + MessageList + Composer + SettingsPanel workspace |

### Modified Files (Chat)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `thinking` and `sources` fields to Message |
| `src/app/api/chat/[conversationId]/stream/route.ts` | Enhanced SSE to support thinking blocks and sources (messageId event, thinking/reasoning, sources arrays) |
| `src/middleware.ts` | Added `/overview*` and `/api/razorpay*` to public routes; `/chat` removed (now protected) |
| `src/app/globals.css` | Merged `--color-cb-*` vars, chat-scrollbar, fade-in-up/shimmer/slide-in-right animations; `#chat-workspace` gradient text exclusion |
| `tsconfig.json` | Excluded `cobentt_landing/` directory |

### Deprecated / Removed (Chat)

| File | Replaced By |
|------|-------------|
| `src/app/(modes)/chat/` (entire directory) | `src/app/chat/` |

---

## Phase 8 — Landing Pages (`/overview/*`)

### What Changed

All cobentt_landing marketing/info pages were ported under `/overview/*` routes, preserving their original styling and animations.

#### Routes Created

| Route | Content |
|-------|---------|
| `/overview` | Full landing page: Hero (canvas particles), TheWorkspace, MeridianSection, InsideMeridian, ContextEngine, DevelopersSection, EcosystemMarquee, Security, FinalCTA |
| `/overview/features` | Feature grid: Core Workspace, Intelligence Layer, Research Tools, Developer Tools, Platform |
| `/overview/research` | Research pipeline: Collect Sources → Read PDFs → Export with citations |
| `/overview/developers` | Developer tools: VS Code, GitHub, Terminal, SDK & API |
| `/overview/pricing` | Plans (Free/Pro/Teams) with Razorpay checkout, Enterprise section, FAQ |
| `/overview/about` | Mission, values, contact |
| `/overview/blog` | Blog post listing |
| `/overview/docs` | Documentation index |
| `/overview/privacy` | Privacy policy |
| `/overview/terms` | Terms of service |
| `/overview/ai-disclosure` | AI disclosure |
| `/overview/licenses` | Licenses and attributions |
| `/overview/account-deletion` | Account deletion process |

### New Files Created (Landing)

| File | Purpose |
|------|---------|
| `src/components/overview/ui/icons.tsx` | Custom SVG icon set (portable, self-contained) |
| `src/components/overview/ui/section-container.tsx` | Scroll-animated section wrapper with parallax |
| `src/components/overview/ui/asymmetric-button.tsx` | Styled button with asymmetric border-radius (primary/secondary/ghost/outline) |
| `src/components/overview/ui/asymmetric-card.tsx` | Styled card with asymmetric border-radius |
| `src/components/overview/navbar.tsx` | Sticky navbar with Clerk auth state, mobile drawer |
| `src/components/overview/footer.tsx` | Footer with product/resource/legal/connect link groups |
| `src/components/overview/hero.tsx` | Full canvas particle background + hero content (894 lines) |
| `src/components/overview/features.tsx` | TheWorkspace feature cards with animated icons |
| `src/components/overview/meridian-section.tsx` | Meridian orchestration layer explainer with neural network SVG |
| `src/components/overview/inside-meridian.tsx` | 6-layer engine breakdown grid |
| `src/components/overview/context-engine.tsx` | Knowledge graph visual + stats |
| `src/components/overview/developers-section.tsx` | Developer tools preview with code window mockup |
| `src/components/overview/research-section.tsx` | Research pipeline visual |
| `src/components/overview/ecosystem-marquee.tsx` | Scrolling provider marquee (OpenAI, Anthropic, etc.) |
| `src/components/overview/security.tsx` | Security features grid |
| `src/components/overview/final-cta.tsx` | Bottom CTA section |
| `src/app/overview/layout.tsx` | Overview layout with Navbar + Footer + `.overview-wrapper` accent scoping |
| `src/app/overview/page.tsx` | Landing page composing all sections |
| `src/app/overview/*/page.tsx` (14 pages) | All info pages |

### Modified Files (Landing)

| File | Change |
|------|--------|
| `src/app/globals.css` | Added landing CSS vars (`--color-bg-primary`, `--color-text-primary`, etc.) in `:root` and `@theme inline`; added `.overview-wrapper` accent override; added marquee/glowPulse/fadeInUp animations; added noise-bg |

---

## Phase 9 — Payment System (Razorpay)

### What Changed

The Razorpay subscription payment system was ported from cobentt_landing.

### New Files Created (Payment)

| File | Purpose |
|------|---------|
| `src/lib/premium.ts` | Plan definitions (`PLANS`), localStorage helpers (`getPlanFromStorage`, `setPlanInStorage`), usage tracking |
| `src/components/overview/razorpay-checkout-button.tsx` | Checkout button component: loads Razorpay script, creates order via API, verifies payment, stores plan |
| `src/app/api/razorpay/create-order/route.ts` | Creates Razorpay order via backend SDK |
| `src/app/api/razorpay/verify-payment/route.ts` | Verifies payment signature server-side |
| `src/app/api/payments/confirm/route.ts` | Confirms subscription: verifies signature, updates Clerk metadata, records in backend |
| `src/lib/clerk-admin.ts` | Stub for `updateUserMetadata` |

### Modified Files (Payment)

| File | Change |
|------|--------|
| `src/middleware.ts` | `/api/razorpay*` added to public routes (handled by middleware) |

---

## Phase 10 — Cleanup & Final Integration

### What Changed

Old `customDesigns/*` pages were redirected to their `/overview/*` equivalents, broken root-level links in the main app's footer were fixed, root-level redirects were added, and the DB schema was pushed.

### Redirects Added (`next.config.ts`)

| Source | Destination | Status |
|--------|-------------|--------|
| `/customDesigns/features` | `/overview/features` | 301 Permanent |
| `/customDesigns/pricing` | `/overview/pricing` | 301 Permanent |
| `/customDesigns/support` | `/overview/about` | 301 Permanent |
| `/privacy` | `/overview/privacy` | 301 Permanent |
| `/terms` | `/overview/terms` | 301 Permanent |
| `/about` | `/overview/about` | 301 Permanent |
| `/research` | `/overview/research` | 301 Permanent |
| `/contact` | `/overview/about` | 301 Permanent |
| `/features` | `/overview/features` | 301 Permanent |

### Updated Footer Links (`src/components/layout/footer.tsx`)

| Link | Old Path | New Path |
|------|----------|----------|
| Pricing | `/customDesigns/pricing` | `/overview/pricing` |
| Features | `/customDesigns/features` | `/overview/features` |
| Support | `/customDesigns/support` | `/overview/about` |
| About | `/about` | `/overview/about` |
| Research | `/research` | `/overview/research` |
| Contact | `/contact` | `/overview/about` |
| Privacy Policy | `/privacy` | `/overview/privacy` |
| Terms of Service | `/terms` | `/overview/terms` |
| Accessibility | `/accessibility` | `/overview/ai-disclosure` |

### Updated Internal Links

| File | Old Link | New Link |
|------|----------|----------|
| `src/app/settings/user/page.tsx` | `/customDesigns/pricing` | `/overview/pricing` |
| `src/app/docs/page.tsx` (x2) | `/customDesigns/support` | `/overview/about` |
| `src/app/customDesigns/features/page.tsx` | `/customDesigns/pricing` | `/overview/pricing` |
| `src/app/customDesigns/pricing/page.tsx` | `/customDesigns/support` | `/overview/about` |

### Database Migration

```bash
prisma db push
```
Added `thinking` and `sources` JSON fields to the Message model. Database schema is in sync with Prisma schema.

---

## Key Design Decisions

### Why tRPC + PostgreSQL instead of localStorage?
- **Persistence**: Messages survive browser cache clear, device change, etc.
- **Consistency**: Same pattern as website/smart contract projects (users expect it)
- **Scale**: PostgreSQL handles millions of messages; localStorage caps at ~5MB
- **Search**: tRPC `conversations.search` queries content in DB
- **Multi-device**: Future-proof for cross-device sync

### Why Adapter Pattern?
cobentt_landing's chat UI is "solid and useful" — the UX, styling, and component structure are high quality. Rather than rewriting them, the adapter (`useChatAdapter`) provides the same interface (`useChat()`) that the components expect, but backed by tRPC instead of localStorage. This minimizes code changes in the components themselves.

### CSS Variable Strategy
Landing page components use `bg-bg-primary`, `text-text-primary`, `text-accent`, etc. These were added to `@theme inline` in globals.css. The `--color-accent` override is scoped to `.overview-wrapper` so it doesn't conflict with the main app's existing accent color usage.

### Why Redirect Instead of Delete
The `customDesigns/*` pages are still referenced by some bookmarks and internal links. Adding 301 redirects in `next.config.ts` ensures backward compatibility while routing users to the new polished landing pages.

---

## Security

### Authentication
- All chat API routes protected by Clerk middleware
- tRPC `protectedProcedure` enforces `ctx.auth.userId` on every mutation/query
- SSE streaming endpoint verifies `session.userId` matches `conversation.userId`
- Sidebar filters conversations by userId

### Data Isolation
- Every `Conversation` has a `userId` field
- tRPC queries always filter by `userId: ctx.auth.userId`
- No user can access another user's conversations
- Message tree branching (`parentMessageId`) ensures data integrity

### Input Validation
- tRPC inputs validated via Zod schemas (string length, required fields)
- SSE endpoint validates message type and content
- Max message length: 10,000 characters (tRPC) / 8,000 characters (Composer UI)

### API Key Security
- User-provided API keys stored in localStorage only (never sent to server)
- Backend uses server-side `OPENROUTER_API_KEY` as fallback
- No API keys transmitted in SSE requests

---

## E2E Testing Guide

### Chat Workspace (`/chat`)

1. **Start a new chat**
   - Navigate to `/chat`
   - Type a message and send
   - Verify SSE streaming renders progressively
   - Verify message appears in sidebar
   - Verify page reload → messages still visible

2. **Conversation management**
   - Create multiple conversations; switch between them
   - Pin a conversation; verify pinned badge
   - Delete a conversation; verify removed
   - Search conversations by title/content

3. **Message actions**
   - Copy message content
   - Regenerate last assistant response
   - Verify thinking blocks render (if model returns reasoning traces)
   - Verify source citations render (if applicable)
   - Check web search toggle works

4. **Settings panel**
   - Open settings; verify all tabs (Hub, Appearance, Advanced, Privacy)
   - Change provider; verify saved
   - Set API key; verify stored in localStorage only
   - Toggle dark mode; verify changes apply
   - Change model/params (temperature, max tokens, etc.)

5. **Auth boundary**
   - Log out → `/chat` redirects to sign-in
   - Log back in → all conversations intact

### Landing Pages (`/overview/*`)

6. **Home page** (`/overview`)
   - Verify Hero renders with animated particles
   - Scroll through all sections (TheWorkspace, Meridian, InsideMeridian, Context Engine, Developers, Ecosystem Marquee, Security, Final CTA)
   - Verify animations fire on scroll
   - Verify Marquee animates horizontally
   - Click "Download Cobentt" and "Open Workspace" buttons

7. **Info pages**
   - `/overview/features` — verify feature grid renders
   - `/overview/research` — verify pipeline and use cases
   - `/overview/developers` — verify developer features and SDK section
   - `/overview/about` — verify mission, values, contact
   - `/overview/blog` — verify blog listing
   - `/overview/docs` — verify docs index
   - `/overview/privacy`, `/overview/terms`, `/overview/ai-disclosure`, `/overview/licenses`, `/overview/account-deletion` — verify legal pages

8. **Navbar & Footer** (across all `/overview/*` pages)
   - Navbar: verify links work (Features → `/overview/features`, etc.)
   - Navbar: verify scroll transparency effect
   - Navbar: verify Clerk auth state (Login/Open Workspace when signed out; Open Workspace/Sign Out when signed in)
   - Navbar: verify mobile menu on small screens
   - Footer: verify all links resolve correctly

### Pricing & Payment (`/overview/pricing`)

9. **Pricing page**
   - Verify plans display (Free/Pro/Teams)
   - Verify "Most Popular" badge on Pro
   - Verify FAQ accordion interacts
   - Verify Enterprise section renders

10. **Razorpay checkout** (requires Razorpay keys)
    - Click "Start Free Trial" on Pro
    - Verify Razorpay checkout modal opens
    - Complete test payment
    - Verify plan is stored (localStorage `cb_plan`)
    - Verify `/api/razorpay/create-order` and `/api/razorpay/verify-payment` respond

### Redirects

11. **Old routes redirect**
    - `/customDesigns/features` → 301 to `/overview/features`
    - `/customDesigns/pricing` → 301 to `/overview/pricing`
    - `/customDesigns/support` → 301 to `/overview/about`
    - Verify browser URL updates

12. **Footer links** (on non-overview pages like `/docs`, `/settings/user`)
    - Verify pricing link → `/overview/pricing`
    - Verify features link → `/overview/features`
    - Verify support link → `/overview/about`

### Build Verification

13. `npm run build` passes with zero errors

---

## Phase 11 — Chat Bug Fixes & Polish

### What Changed

Fixed reported `/chat` issues plus a batch of latent bugs found during a deep pass over the workspace.

| Fix | Root Cause | Files |
|-----|-----------|-------|
| **First chat showed the user input twice** | `displayMessages` appended the optimistic `pendingUserMsg` on top of `activeThread.messages`, which already contained the persisted user message after `createConversation` + `selectThread` refetched `getById`. During streaming both rendered. | `src/app/chat/chat-content.tsx` |
| **Fast refresh broke the UI (input invisible / stuck Stop button)** | Streaming state was split: `isStreaming` lived in the store (survives refresh) while `streamingMsg`/`pendingUserMsg` were local to `ChatContent` (reset on refresh). After refresh mid-stream the stale `isStreaming=true` blocked `handleSend` and forced the Stop button. | `src/components/chat/composer.tsx` |
| **Line under every assistant response** | A `border-t` row divider under each response was unwanted. Removed. | `src/components/chat/message-list.tsx` |
| **Copy/share buttons on the wrong side** | Actions row now puts Copy/Regenerate/Share on the left; "Thought for Xs" clock stays on the right. | `src/components/chat/message-list.tsx` |
| **Regenerate button never rendered** | `MessageList` accepted `onRegenerate` but `ChatContent` never passed it — dead code. Now wired: `ChatContent` forwards a regenerate request to `Composer`, which calls `chatMessages.regenerate` (deletes prior branch replies) then re-streams the user message. | `src/app/chat/chat-content.tsx`, `src/components/chat/composer.tsx` |
| **Composer overlap / `-translate-y-[10%]` hack** | Removed the translate hack on the composer wrapper that could overlap/cut off the input. | `src/app/chat/chat-content.tsx` |
| **Dead `updateLastAssistant` stub** | Removed the no-op stub and its interface member from the chat store. | `src/lib/chat-store.tsx` |

### Verification

- `npx tsc --noEmit` — clean
- `npx eslint src/app/chat src/components/chat src/lib/chat-store.tsx` — clean
- `next build` — passes

### Notes

- The chat store is backed by tRPC + PostgreSQL (not localStorage); the dedupe in `displayMessages` handles both first-message and `?q=` deep-link flows.
- Known leftovers (not addressed in this phase): unused `src/modules/chat/ui/components/*` duplicates, duplicate `createConvMutation` in store vs composer, edit-message re-sends instead of replacing, `createThread` "pending"/"New chat" junk-row behavior.

## Phase 12 — Flower Loader, Token Provider Fix & Message Persistence

### What Changed

| Fix | Root Cause | Files |
|-----|-----------|-------|
| **Circular loader → flower animation** | Replaced the plain spinner with a self-contained looping flower loader (stem draw, leaves, bloom sway/breath/sparkle, unique gradient ids via `useId`). Removed the rotating "ads" placeholder array from the thinking loader. | `src/components/flower-loader.tsx` (new), `src/components/chat/message-list.tsx` |
| **`prisma:error` — invalid `AIProvider` value `"OPENROUTER"`** | `TokenUsage.provider` is an `AIProvider` enum that only accepted `OPENAI`/`ANTHROPIC`, but chat routes pass full model ids like `openrouter/free`. Added `deriveProviderFromModel()` (prefix mapping: openai/gpt, anthropic/claude, openrouter, google/gemini, deepseek, qwen, default: slash→OPENROUTER else CUSTOM), expanded the enum, and added pricing entries for the new providers. DB synced via `prisma db push` (migration workflow is broken — `20260805000000_phase5_indexes` references `"TokenUsage"` while the table is `@@map`'d to `token_usage`). | `prisma/schema.prisma`, `src/lib/ai/pipeline.ts`, `src/lib/token-pricing.ts` |
| **Second user message wiped from the thread** | `handleSend` only persisted the user message on the *first* message (via `conversations.create({ initialMessage })`). For existing threads it called `handleStream` directly, so the user message was never written to the DB — the `getById` refetch after streaming discarded it. `handleSend` now persists each user message via `chatMessages.create` before streaming. | `src/components/chat/composer.tsx` |
| **Current user message fed to the LLM twice** | The stream route reads the last 6 messages from the DB *and* appends the current user message. Once the user message is persisted before streaming, the last history entry is the same message — now dropped before building context. | `src/app/api/chat/[conversationId]/stream/route.ts` |

### Verification

- `npx tsc --noEmit` — clean
- `npx eslint` on changed files — 0 errors (only pre-existing unused-var/deps warnings)
- `next build` — passes; `/api/chat/[conversationId]/stream` and `/chat` routes compile
- Provider derivation spot-checked with `tsx` against a sample of model ids
