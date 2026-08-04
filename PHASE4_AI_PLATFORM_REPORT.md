# PHASE 4 — AI PLATFORM, AGENT ORCHESTRATION & SANDBOX RUNTIME

**Date:** Aug 05, 2026
**Status:** GO — All critical AI platform issues resolved
**Build:** Passes | **TypeScript:** 0 errors

---

## FILES MODIFIED / CREATED

### New Files (2)
| File | Purpose |
|------|---------|
| `src/lib/ai/safety.ts` | Prompt injection detection + input sanitization |
| `src/trpc/routers/settings.ts` | User-facing audit log tRPC procedure (from Phase 3.6) |

### Modified Files (8)
| File | Change |
|------|--------|
| `src/lib/ai/client.ts` | Added retry/backoff (3 retries, exponential), 60s timeout, abort controller, error classification |
| `src/lib/ai/usage.ts` | Consolidated to single source of truth (re-exports from token-estimator.ts) |
| `src/lib/rate-limit.ts` | Wired up RATE_LIMITS config, added per-endpoint differentiation, `getRateLimitConfig()` |
| `src/app/api/chat/[conversationId]/stream/route.ts` | Added token tracking, quota enforcement, prompt injection detection, input sanitization, audit logging |
| `src/app/api/modes/[mode]/generate/route.ts` | Fixed hardcoded "OPENAI" provider to dynamic model-based detection |
| `src/app/api/modes/deep-research/generate/route.ts` | Same provider fix |
| `src/app/api/sandbox/restore/route.ts` | Added auth check, ownership verification, rate limiting |
| `src/inngest/functions.ts` | Changed hardcoded `gpt-5` to configurable `event.data.model` |
| `src/middleware.ts` | Added `/api/trpc(.*)` to public routes (tRPC handles own auth) |

---

## AI ARCHITECTURE AUDIT SUMMARY

### Current Stack
- **Providers:** OpenRouter (primary), OpenAI-compatible endpoints
- **Agent Framework:** @inngest/agent-kit with createNetwork
- **Sandbox:** E2B (cogerphereailabsbeta1 template)
- **Orchestration:** Inngest functions (CobenttAgent, generateContract)
- **Streaming:** Manual SSE with ReadableStream

### Critical Issues Found & Fixed

| # | Issue | Severity | Fix |
|---|-------|----------|-----|
| 1 | Chat streaming had no token tracking | CRITICAL | Added `recordTokenUsage` call after streaming completes |
| 2 | Chat streaming had no quota enforcement | CRITICAL | Added `enforceQuota` call before AI request |
| 3 | No retry/backoff on AI API calls | HIGH | Implemented exponential backoff with 3 retries, 60s timeout |
| 4 | Agent model hardcoded to `gpt-5` | HIGH | Changed to `event.data.model` with fallback to `openai/gpt-4o-mini` |
| 5 | Sandbox restore had no ownership check | HIGH | Added auth + userId verification |
| 6 | No prompt injection protection | HIGH | Created `safety.ts` with pattern detection + sanitization |
| 7 | Two conflicting `estimateTokens` implementations | MEDIUM | Consolidated `ai/usage.ts` to re-export from `token-estimator.ts` |
| 8 | `RATE_LIMITS` config exported but never used | MEDIUM | Wired up per-endpoint differentiation |
| 9 | Provider hardcoded as "OPENAI" in mode generation | MEDIUM | Dynamic detection from model string |
| 10 | `tRPC 404` on `projects.getAll` | CRITICAL | Added `/api/trpc(.*)` to public middleware routes |

---

## PHASE 4.2 — MODEL ROUTING

**Status:** Partially implemented (OpenRouter only)

Current: Single provider (OpenRouter) with OpenAI-compatible API.
- All models route through OpenRouter's OpenAI-compatible endpoint
- Agent uses `openai()` adapter from agent-kit regardless of actual provider
- No direct Anthropic/Google integration

**Gap:** Full provider abstraction with fallback chains not yet implemented.
**Impact:** Low — OpenRouter provides access to all listed models.

---

## PHASE 4.3 — CONTEXT ENGINEERING

**Status:** Basic implementation

- Chat: Last 6 messages as context
- Agent: Last 6 messages + system prompt (~8000 tokens)
- Modes: Last 8 messages + mode-specific prompt

**Gaps identified:**
- No RAG / embedding search
- No file context injection (agent uses readFiles tool)
- No conversation summarization
- No token budget management
- System prompt is static and large

---

## PHASE 4.4 — AGENT ORCHESTRATION

**Status:** Working with limitations

Tools: terminal, createOrUpdateFiles, readFiles
- Max 30 iterations per agent run
- No parallel tool execution
- No human-in-the-loop
- Screenshot capture via Playwright (non-critical)

---

## PHASE 4.5 — SANDBOX SECURITY

**Status:** Secured

- Auth check: `auth().userId` required
- Ownership: `project.userId === session.userId` verified
- Rate limiting: 30 restores/day per user
- Isolation: E2B templates provide process isolation
- Cleanup: Sandbox timeout via `SANDBOX_TIMEOUT`

---

## PHASE 4.6 — STREAMING

**Status:** Working

- SSE via ReadableStream
- Token-by-token forwarding
- Reasoning token support (delta.reasoning)
- Error recovery (sets message status to ERROR)
- No heartbeat or reconnection (client-side)

---

## PHASE 4.7 — AI SECURITY

**Status:** Implemented

- Prompt injection detection: 15+ patterns + phrase matching
- Input sanitization: Control character removal, length limits
- Audit logging: Injection attempts logged
- Input length limits: 10,000 chars max
- Output validation: Basic response structure checks

---

## PRODUCTION READINESS SCORE

| Category | Score | Notes |
|----------|-------|-------|
| Token Tracking | 9/10 | All endpoints now track usage |
| Quota Enforcement | 9/10 | All endpoints enforce quotas |
| Retry/Resilience | 8/10 | 3 retries with exponential backoff |
| Provider Abstraction | 6/10 | OpenRouter-only, no direct providers |
| Context Engineering | 5/10 | Basic last-N messages, no RAG |
| Agent Orchestration | 7/10 | Single agent loop, max 30 iterations |
| Sandbox Security | 9/10 | Auth, ownership, rate limiting |
| Streaming | 8/10 | SSE working, no reconnection |
| AI Security | 8/10 | Injection detection, sanitization |
| Observability | 6/10 | Audit logging, no structured metrics |
| Performance | 7/10 | Retry backoff, no caching |

**Overall: 7.5/10**

---

## REMAINING RISKS

| Risk | Severity | Mitigation |
|------|----------|------------|
| No direct Anthropic integration | Medium | Use OpenRouter as proxy |
| No RAG / embedding search | Medium | Future enhancement |
| Static system prompts (~8000 tokens) | Medium | Prompt optimization needed |
| No structured observability metrics | Low | Add OpenTelemetry in Phase 5 |
| No conversation summarization | Low | Context window is sufficient for current use |
| Client settings (model) are dead UI | Low | Server uses env vars exclusively |

---

## GO / NO-GO RECOMMENDATION

### GO

All critical AI platform issues resolved:
- Token tracking across all endpoints
- Quota enforcement on all AI calls
- Retry/backoff on AI API calls
- Configurable model (not hardcoded)
- Sandbox security (auth + ownership)
- Prompt injection protection
- tRPC 404 fixed

**Phase 5 (Performance & Observability) may begin.**
