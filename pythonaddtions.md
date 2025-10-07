## Python Additions – Integration Plan, Tasks, Resources, and Best Practices

## Day 1 — Foundations

### Why Python in Cogerphere
- Leverage Python’s mature ecosystem for code analysis, NLP/ML, data wrangling, and scraping.
- Run Python as a sidecar microservice (FastAPI) that our Next.js/Inngest flows call for heavy or specialized tasks.
- Return artifacts (files, summaries, embeddings) into our existing `Message` + `Fragment` model for preview and reuse.

---

### Architecture Overview
- **Service**: FastAPI + Uvicorn in Docker, deployed separately from the Next.js app.
- **Consumers**: 
  - tRPC procedures for synchronous tasks.
  - Inngest steps for long-running/background tasks.
- **Security**: Shared API key via headers; IP allowlist (optional). Enforce timeouts/retries from caller.
- **Observability**: Structured logs, Prometheus metrics, request IDs.
- **Storage**: Postgres (existing) plus optional `pgvector` for embeddings.

---

### Endpoints (Planned)
- `GET /health` – liveness/readiness.
- `POST /code/quality` – run Ruff/Black in a sandbox on provided code, return diagnostics and formatted diff.
- `POST /code/refactor` – propose/refactor using `libcst`/`ast`, return diff and rationale.
- `POST /nlp/spec` – convert free-form prompt into a structured feature spec (JSON) to guide generation.
- `POST /ml/embed` – return text embeddings via `sentence-transformers`; optional persist to Postgres/pgvector.
- `POST /data/csv-to-api` – infer schema from CSV, propose CRUD scaffolds and validation.
- `POST /web/scrape` – fetch and extract page content + metadata, normalize to JSON.

---

### Integration Points in Our Codebase
- Next.js/tRPC server calls → call FastAPI via `httpx` (Python) / `fetch` or `undici` (Node) with timeouts.
- Inngest background steps → invoke Python endpoints, stream progress (future), save outputs in `Message.fragments`.
- UI hooks in `project-view` → buttons/forms to trigger Python-powered actions and display results.

---

## Day 2 — Roadmap & Tasks
### Learn-by-Building TODOs (with resources, use cases, best practices)

1) Create Python FastAPI service skeleton with Dockerfile and Poetry
- Resources:
  - FastAPI docs: [https://fastapi.tiangolo.com](https://fastapi.tiangolo.com)
  - Poetry: [https://python-poetry.org/docs/](https://python-poetry.org/docs/)
  - Docker Python: [https://docs.docker.com/language/python/](https://docs.docker.com/language/python/)
- Use cases: Foundation for all Python features; standardized packaging, reproducible builds.
- Best practices: Pin versions, use `poetry.lock`, health/readiness endpoints, graceful shutdown, `uvicorn --workers N`.
- Acceptance: `GET /health` returns 200; container builds and runs locally.

2) Expose /code/quality to run Ruff+Black and return diagnostics
- Resources:
  - Ruff: [https://docs.astral.sh/ruff/](https://docs.astral.sh/ruff/)
  - Black: [https://black.readthedocs.io/](https://black.readthedocs.io/)
- Use cases: Static analysis and autoformat for fragments; quality gate before saving.
- Best practices: Run in temp dir, limit file size, return unified diff + lint messages; never execute untrusted code.
- Acceptance: `POST /code/quality` with files returns lint results and formatted diff JSON.

3) Add /code/refactor endpoint to propose AST-based refactors
- Resources:
  - LibCST: [https://libcst.readthedocs.io/](https://libcst.readthedocs.io/)
  - Python AST: [https://docs.python.org/3/library/ast.html](https://docs.python.org/3/library/ast.html)
- Use cases: Safe codemods (e.g., rename symbol, extract function, add type hints).
- Best practices: Pure transforms, idempotency, tests on sample inputs, emit patch/diff with rationale.
- Acceptance: Given code + transform spec → returns diff + summary; unit tests cover at least 3 patterns.

4) Implement /nlp/spec to turn prompts into structured feature specs
- Resources:
  - Pydantic: [https://docs.pydantic.dev/latest/](https://docs.pydantic.dev/latest/)
  - Prompting patterns: OpenAI guides (model-agnostic concepts)
- Use cases: Convert user intent into a machine-checked spec to drive generation (routes, entities, fields).
- Best practices: Define strict schema with enums/unions, validate length, provide examples; log only non-PII.
- Acceptance: Input prompt → JSON spec with fields like `featureName`, `routes`, `entities`, `acceptanceCriteria`.

5) Add /ml/embed for embeddings via sentence-transformers; store in Postgres (pgvector)
- Resources:
  - sentence-transformers: [https://www.sbert.net](https://www.sbert.net)
  - pgvector: [https://github.com/pgvector/pgvector](https://github.com/pgvector/pgvector)
- Use cases: Semantic search over prior fragments/messages to ground the agent.
- Best practices: CPU models for portability, batch inputs, normalize vectors, index with `ivfflat`, cache results.
- Acceptance: `POST /ml/embed` returns vectors; optional `persist=true` writes to `embeddings` table with `projectId`.

6) Create /data/csv-to-api to infer schemas and generate CRUD scaffolds
- Resources:
  - pandas: [https://pandas.pydata.org/docs/](https://pandas.pydata.org/docs/)
  - pyarrow: [https://arrow.apache.org/docs/python/](https://arrow.apache.org/docs/python/)
- Use cases: Upload CSV → infer types/PKs/foreign keys → propose Prisma model + tRPC endpoints.
- Best practices: Sample large files, detect date/enum columns, escape/canonicalize headers, surface uncertainties.
- Acceptance: Returns inferred schema, suggested Prisma model, and endpoint stubs.

7) Add /web/scrape to extract content and metadata from URLs
- Resources:
  - requests: [https://requests.readthedocs.io/](https://requests.readthedocs.io/)
  - BeautifulSoup: [https://www.crummy.com/software/BeautifulSoup/bs4/doc/](https://www.crummy.com/software/BeautifulSoup/bs4/doc/)
  - selectolax (fast HTML): [https://github.com/rushter/selectolax](https://github.com/rushter/selectolax)
- Use cases: Pull docs/content for grounding; summarize into specs; crawl a few levels deep (optional).
- Best practices: Respect robots, timeouts, retry with backoff, user-agent, domain allowlist, sanitize HTML.
- Acceptance: Given URL(s) → JSON `{ title, text, headings, links, meta }` with rate-limit headers.

8) Wire Inngest step to call Python service with retries/timeouts
- Resources:
  - Inngest: [https://www.inngest.com/docs](https://www.inngest.com/docs)
  - tenacity (Python retries): [https://tenacity.readthedocs.io/](https://tenacity.readthedocs.io/)
- Use cases: Offload heavy tasks; save outputs in assistant messages with fragments.
- Best practices: Circuit-breaker semantics, exponential backoff, idempotency keys, clear error envelopes.
- Acceptance: Inngest run logs show Python call; success path saves `Fragment`; error path saves `ERROR` message.

9) Extend agent toolset to invoke Python endpoints from Next.js
- Resources:
  - httpx (client patterns): [https://www.python-httpx.org/](https://www.python-httpx.org/)
  - Node fetch/undici timeouts: use `AbortController` patterns.
- Use cases: Agent can choose tools like “lint/refactor/spec/scrape/embed”.
- Best practices: Fixed allowlisted endpoints, schema-validated IO, strict timeouts, streaming future-friendly.
- Acceptance: Agent tool invocations produce artifacts attached to messages.

10) Add pytest test suite and GitHub Actions CI for Python service
- Resources:
  - pytest: [https://docs.pytest.org/](https://docs.pytest.org/)
  - pre-commit: [https://pre-commit.com/](https://pre-commit.com/)
  - GitHub Actions: [https://docs.github.com/actions](https://docs.github.com/actions)
- Use cases: Guard quality and security; fast feedback on PRs.
- Best practices: Unit tests + contract tests; run Ruff+Black in CI; coverage reports.
- Acceptance: CI passes on lint, format, and tests; pre-commit hooks configured.

11) Add UI hooks (buttons/forms) to trigger Python features
- Resources:
  - React Hook Form: [https://react-hook-form.com/](https://react-hook-form.com/)
  - TanStack Query: [https://tanstack.com/query/latest](https://tanstack.com/query/latest)
- Use cases: Trigger lint/refactor/spec/embed/scrape from the project view; render output fragments.
- Best practices: Explicit loading/error states, optimistic UI where safe, debounce inputs.
- Acceptance: Buttons/forms appear in `project-view`; results show as message cards with fragments.

---

## Day 3 — Security & Operations
### Security & Operational Best Practices
- Validate and size-limit all inputs; reject overly large payloads.
- Never execute untrusted code; static analysis only unless sandboxed.
- Enforce auth via API key; rotate keys; do not log secrets or PII.
- Timeouts and retries with jitter; treat Python service as unreliable network hop.
- Structured logs (JSON) with request IDs; metrics for latency, error rate, throughput.
- Resource caps in Docker (CPU/mem); model downloads cached and warmed up at startup.

---

## Day 4 — API Contracts
### Example Contracts (sketch)
```json
POST /code/quality
{
  "files": [{"path": "main.py", "content": "print( 'hi' )"}]
}

→
{
  "lint": [{"path": "main.py", "rule": "E201", "message": "whitespace after '(", "line": 1}],
  "formattedDiff": "diff --git a/main.py b/main.py\n..."
}
```

```json
POST /ml/embed
{
  "inputs": ["Create a React table component"],
  "persist": true,
  "projectId": "abc123"
}

→
{
  "vectors": [[0.01, 0.12, ...]],
  "dimension": 768
}
```

---

## Day 5 — Rollout Plan
### Rollout Order (suggested)
1. Service skeleton + /health
2. /code/quality
3. /web/scrape
4. /nlp/spec
5. /ml/embed (+ pgvector)
6. /data/csv-to-api
7. /code/refactor
8. Inngest integration + agent tools + UI hooks
9. Tests/CI and observability hardening

---

## Day 6 — Dependencies
### Appendix: Suggested Dependencies
- API/runtime: `fastapi`, `uvicorn`, `pydantic`, `httpx`
- Code tools: `ruff`, `black`, `isort`, `libcst`
- NLP/ML: `sentence-transformers` (CPU), `scikit-learn`, optional `spacy`
- Data: `pandas`, `pyarrow`
- Scraping: `requests`, `beautifulsoup4`, `selectolax`, optional `playwright`
- Infra/QoS: `tenacity` (retries), `structlog` or `loguru`, `prometheus-client`, `pytest`, `pre-commit`


---

## Day 7 — Phase-by-Phase Guides
### Phase-by-Phase Learning and Implementation

1) FastAPI service skeleton
- Learn: FastAPI routing, Pydantic models, Poetry basics, Dockerizing Python, Uvicorn workers
- Implementation workflow:
  - Initialize Poetry project; add `fastapi`, `uvicorn[standard]`, `pydantic`
  - Create `main.py` with `GET /health` and `GET /version`
  - Add CORS, API key auth dependency, structured logging
  - Add `Dockerfile` and optional `docker-compose.yaml`
- With data (hands-on):
  - Run locally: `poetry run uvicorn main:app --reload`; verify `/health` 200
  - Build Docker image; run container; confirm env-based API key header works

```bash
poetry new py-svc && cd py-svc
poetry add fastapi uvicorn[standard] pydantic
poetry run uvicorn main:app --reload
```

2) /code/quality (Ruff + Black)
- Learn: Ruff rules/config, Black formatting, safe temp dir handling, no execution of user code
- Implementation workflow:
  - Input model: `{ files: [{ path, content }] }`
  - Write files to temp dir; run Ruff (lint) and Black (format)
  - Collect lint messages and unified diff; enforce limits and timeouts
- With data (hands-on):
  - Send 1–3 small files; verify lint issues + diff returned
  - Add tests for clean code, style issues, syntax errors

```bash
poetry add ruff black
```

3) /web/scrape (content + metadata)
- Learn: HTTP client timeouts/retries, robots/ethics, BeautifulSoup/selectolax parsing
- Implementation workflow:
  - Input: `{ url: string }`
  - Fetch with custom UA + timeout; parse title/headings/text/links/meta
  - Normalize to JSON; optional domain allowlist; sanitize HTML
- With data (hands-on):
  - Scrape 2–3 docs pages; validate structured output; remove boilerplate

```bash
poetry add requests beautifulsoup4 selectolax
```

4) /nlp/spec (prompt → structured feature spec)
- Learn: Pydantic schema design, deterministic prompting patterns, size/PII guardrails
- Implementation workflow:
  - Input: `{ prompt: string }`
  - Validate length; produce JSON spec: `featureName`, `routes`, `entities`, `acceptanceCriteria`
  - Optional LLM call; keep schema stable and validated
- With data (hands-on):
  - Run 3–5 prompts; ensure consistent fields; persist as `Fragment`

```bash
poetry add httpx  # only if calling external APIs
```

5) /ml/embed (sentence-transformers + pgvector)
- Learn: sentence-transformers CPU models, vector norms, pgvector indexes
- Implementation workflow:
  - Input: `{ inputs: string[], persist?: boolean, projectId?: string }`
  - Load model once; batch-encode; L2-normalize; return vectors; optional persist
- With data (hands-on):
  - Embed 20 prompts; test nearest-neighbor query; wire retrieval helper in Node

```bash
poetry add sentence-transformers numpy
```

---

## Day 8 — AI Enhancements
## AI Enhancements with Python (Learn → Implement → With data)

### A) Retrieval-Augmented Generation (RAG) over Fragments
- Learn:
  - Embeddings (cosine similarity, normalization), chunking strategies
  - Vector databases (pgvector), retrieval pipelines
- Implementation workflow:
  - Python: `/ml/embed` (already planned) + new `/ml/search` to query top-k vectors for a `projectId`
  - Node: retrieval helper that fetches top-k fragments, builds a prompt context for the agent
  - Persist embeddings on fragment creation; re-embed on updates
- With data:
  - Index 100+ fragment texts; query for 10 prompts; verify improved answer grounding
  - Log retrieval precision@k and latency

### B) Model Orchestration and Tool Routing
- Learn:
  - When to use small vs large models; latency vs quality trade-offs
  - Deterministic tool selection using function-calling style schemas
- Implementation workflow:
  - Python: `/ai/route` endpoint that classifies requested task (lint, scrape, spec, gen)
  - Node: before tool execution, call `/ai/route` to pick the correct Python endpoint
  - Add rule-based fallbacks and confidence thresholds
- With data:
  - Label 50 tasks; compare router decisions vs baseline; measure error rate and latency

### C) Automated Evaluations (Quality, Safety, Regression)
- Learn:
  - Eval taxonomies (unit tests, golden sets, semantic similarity)
  - Metrics: pass@k, BLEU/ROUGE (where relevant), task success
- Implementation workflow:
  - Python: `/eval/run` that executes a suite against saved prompts/outputs
  - Store eval cases in Postgres; nightly Inngest job triggers evals; report summary
- With data:
  - Seed 20 golden prompts; run eval before/after changes; track score deltas

### D) Safety & Guardrails
- Learn:
  - PII redaction, prompt injection patterns, output moderation heuristics
  - Rate limiting and content filtering
- Implementation workflow:
  - Python: `/ai/moderate` for input/output checks (regex + heuristics)
  - Node: call moderation before saving assistant messages; downgrade or block risky outputs
- With data:
  - Red-team 30 prompts (PII/leak/injection); ensure blocks or sanitization occur; log reasons

### E) Code Generation Improvements (Python-side Static Checks)
- Learn:
  - AST/LibCST transformations for consistency (imports/order, type hints)
  - Multi-file consistency checks
- Implementation workflow:
  - Extend `/code/quality` to include import sorting (`isort`) and simple anti-pattern checks
  - Optionally `/code/summarize` to create high-level code summaries for fragments
- With data:
  - Run on 10 generated fragments; verify reduced lint issues; present summaries in UI

### F) Agentic Workflows (Planning → Tools → Synthesis)
- Learn:
  - ReAct/plan-and-execute patterns; memory and scratchpads
  - Deterministic loops with clear stopping criteria
- Implementation workflow:
  - Python: `/agent/plan` to break a prompt into steps mapped to existing tools
  - Node/Inngest: execute steps, collect artifacts; `/agent/summarize` to produce final result
- With data:
  - Compare single-shot vs plan-and-execute on 5 tasks (e.g., “add login page + tests”)

### G) Dataset Building & Fine-Tuning Hooks (Optional)
- Learn:
  - Data schematization, deduplication, anonymization
  - Fine-tuning dataset formats (JSONL, instruction tuning)
- Implementation workflow:
  - Python: `/data/export` to export messages/specs/fragments into train/eval splits
  - Optionally `/ai/fine-tune/prepare` to clean and shard data
- With data:
  - Export 200 examples; verify schema; run small offline experiments

---

### AI Feature Endpoints (Proposed)
- `POST /ml/search` → `{ query: string, projectId: string, k?: number }` → `{ results: [{fragmentId, score}] }`
- `POST /ai/route` → `{ task: string, meta?: object }` → `{ target: "code/quality" | "web/scrape" | ... }`
- `POST /eval/run` → `{ suiteId?: string }` → `{ summary, cases }`
- `POST /ai/moderate` → `{ text: string, direction: "input"|"output" }` → `{ allowed: boolean, reasons: string[] }`
- `POST /code/summarize` → `{ files: [...] }` → `{ summary, highlights }`
- `POST /agent/plan` → `{ goal: string }` → `{ steps: [{tool, input}] }`
- `POST /agent/summarize` → `{ artifacts: [...] }` → `{ message, files? }`

---

## Day 9 — Latency Playbook
## Reducing AI Response Time (Latency Playbook)

These tactics are aligned with our Next.js + Inngest + Python sidecar setup.

- Fast starts
  - **Model pre-warm**: Load sentence-transformers and parsers at FastAPI startup; lazy-load heavier tools once and cache in-process.
  - **Sandbox reuse (E2B)**: Reuse containers/sessions across Inngest steps where safe to avoid cold boots.
  - **Connection pooling**: Use pooled `httpx.AsyncClient` in FastAPI and pooled Postgres connections (server + Python).

- Less work per request
  - **Router-first**: `/ai/route` sends simple tasks to cheap/fast tools (e.g., `/code/quality`) and avoids large models.
  - **Partial RAG**: Cache top-k for frequent prompts per `projectId`; invalidate on new fragment writes.
  - **Approximate search**: Use `pgvector` IVFFLAT with tuned `lists/probes` for sub-100ms retrieval.
  - **Memoization**: Cache embeddings for identical strings; hash inputs (e.g., SHA-256) as keys.

- Parallelism and streaming
  - **Parallel tools**: Run independent Python endpoints concurrently from Inngest (e.g., scrape + embed).
  - **HTTP streaming**: For long operations, stream partial results and surface early progress in the UI.
  - **Batching**: Batch embedding/text ops to reduce overhead and maximize CPU vectorization.

- Payload hygiene
  - **Compact contracts**: Use minimal JSON shapes; avoid sending redundant large `files` payloads across hops.
  - **Compression**: Enable gzip for Python responses; set `Accept-Encoding: gzip` on Node callers.
  - **Typed selects**: Use Prisma `select`/`include` narrowly to avoid over-fetching.

- Timeouts and resiliency
  - **Aggressive timeouts**: `5–10s` for Python endpoints by default; shorter for routing/moderation.
  - **Retries with jitter**: Use `tenacity` patterns in Python and backoff in Node; circuit-break on repeated failures.
  - **Graceful degrade**: If RAG fails, answer without retrieval but annotate message with a warning.

- FastAPI performance knobs
  - **Uvicorn workers**: Set workers to `min(cores, 4)`; prefer async endpoints (`async def`) + `httpx.AsyncClient`.
  - **Pydantic v2**: Use `model_validate_json` for faster parsing; avoid unnecessary deep copies.
  - **Profiling**: Add Prometheus metrics for request latency, queue time, and model latency.

### Concrete changes to apply
- Preload models in FastAPI startup event and keep global clients (HTTPX, DB pool).
- Add `/ml/search` with pgvector ANN and caching layer (Redis or in-memory LRU per `projectId`).
- Implement gzip responses in FastAPI and enable `compression` on Next.js route handlers.
- Add caller-side concurrency (Promise.all) for independent steps in Inngest runs.
- Add request-level timeouts and circuit breaker wrappers around Python calls.
- Add metrics and logs: `ttfb`, `end-to-end latency`, cache hit-rate, RAG retrieval time.

### Latency Implementation TODOs (Simple Checklist)
- Pre-warm models and clients in FastAPI startup so first request is fast.
- Add `/ml/search` with pgvector ANN and a small cache (by `projectId`).
- Turn on gzip compression for FastAPI responses and Next.js callers.
- Run independent steps in parallel (e.g., scrape and embed at the same time).
- Set strict timeouts and add retries with jitter and a circuit breaker.
- Add basic metrics: request latency, model load time, cache hits/misses.


