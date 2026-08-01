# 🏗️ MODE BUILD PLAN — Slides, Docs, Sheets & Deep Research

Phase-gated build plan for replacing the 4 placeholder modes with working AI-powered builders.

## ✅ **Confirmed Decisions**

- **AI layer**: OpenRouter primary → OpenAI fallback, env-switchable (`AI_PROVIDER`).
- **Search**: Tavily (new key: `TAVILY_API_KEY`).
- **Output**: live preview + file export (pptx / docx / xlsx / pdf).
- **Editor UX**: AI chat + preview split; chat docked right, visible by default, toggleable.
- **Slides**: custom HTML deck rendered in E2B sandbox (`cogerphereailabsbeta1`); `python-pptx` export.
- **Docs**: CodeMirror markdown editor (`@uiw/react-codemirror` + `@codemirror/lang-markdown`); docx + pdf export.
- **Sheet**: Glide Data Grid + HyperFormula; xlsx export.
- **Deep research**: multi-agent iterative refinement (agent-kit pattern); read-only report viewer + phase stepper.
- **Block editor UI**: replicate the Astryx layout pattern using existing Tailwind/shadcn — **do NOT add the Astryx library**.
- **Model routing**: per-mode auto defaults (`MODE_DEFAULTS`) + manual override via existing `ModelSelector`.

---

## 🔲 **PHASE 0 — Foundation (AI Layer, Data Model, Env)**

### P0-A: `src/lib/ai/` provider layer
- `provider.ts` — env-switchable OpenRouter → OpenAI fallback.
- `client.ts` — shared AI client.
- `agent-model.ts` — model resolution + usage tracking hooks.
- `usage.ts` — usage accounting compatible with existing quota/token system.

### P0-B: Refactor AI call sites to use the layer
- [ ] `src/app/api/chat/[conversationId]/stream/route.ts` (lines 71–92 raw-fetch + manual provider branch)
- [ ] `src/app/api/dapp-studio/analyze/route.ts` (line 118 hardcoded `api.openai.com`)
- [ ] `src/inngest/functions.ts` agent-kit `openai()` creators (3×)
- [ ] `src/inngest/ai-contract-generator.ts` agent-kit `openai()` creators (4×)

### P0-C: Environment
- [ ] Add `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `TAVILY_API_KEY` to `.env`

### P0-D: Data model migration
- [ ] `Fragment.sandboxUrl` → nullable `String?`
- [ ] Add `Fragment.mode String?` + `Fragment.meta Json?`
- [ ] Run `prisma migrate dev` + `prisma generate`
- [ ] Research reuses `BuildJob` for progress (no new model)

### P0-E: Dependencies
- [ ] `@glideapps/glide-data-grid`, `hyperformula`
- [ ] `@uiw/react-codemirror`, `@codemirror/lang-markdown`
- [ ] `react-markdown`, `remark-gfm`, `rehype-highlight`
- [ ] `docx`, `xlsx`
- [ ] Sandbox-side: `python-pptx`, `pypdf`

**Gate P0 — PASS when:**
- [ ] All 4 AI call sites route through `src/lib/ai/` with no hardcoded URLs.
- [ ] Switching `AI_PROVIDER=openrouter` vs `=openai` works without code change.
- [ ] Prisma generates cleanly; migration applied.
- [ ] Chat stream + dapp-studio analyze still return identical results to pre-refactor.

---

## 🔲 **PHASE 1 — Shared `ModeCanvas` Shell + Slides**

### P1-A: `ModeCanvas` shell (shared by slides/docs/sheet)
Layout:
```
[ Blocks/Props sidebar ]  [ Canvas (viewport switcher) ]  [ Chat (toggleable, default on) ]
```
- [ ] Left sidebar with **Blocks** (Add Block registry) / **Properties** tabs
- [ ] **Layers** list — click to select, reorder, delete
- [ ] Viewport switcher — desktop / tablet / phone resizes canvas
- [ ] Mobile — fullscreen customize dialog (existing `useIsMobile` patterns)
- [ ] Click canvas block → selects into Properties form ("edit by you")
- [ ] Chat panel right, toggleable, visible by default (ResizablePanelGroup)
- [ ] Chat follow-up → AI regenerates artifact
- [ ] **Templates** — 3 per mode (pitch/growth/onboarding slides; etc.)

### P1-B: Slides mode
- [ ] Agent generates `slides.html` (custom HTML deck engine — no framework)
- [ ] Written to `Fragment.files` as `slides.html`
- [ ] E2B sandbox `cogerphereailabsbeta1` preview via `getHost(3000)`
- [ ] `python-pptx` export in sandbox
- [ ] Templates: pitch / growth / onboarding

**Gate P1 — PASS when:**
- [ ] New slide creates → template applied → agent generates deck → sandbox preview loads
- [ ] Blocks editable via Properties without AI
- [ ] Chat regenerates/edits the deck
- [ ] Viewport switcher works; mobile dialog works
- [ ] PPTX export downloads

---

## 🔲 **PHASE 2 — Docs Mode**

- [ ] Agent generates markdown → `Fragment.files` as `document.md`
- [ ] CodeMirror markdown editing (source view) + rendered preview toggle
- [ ] Templates: blank / essay / blog / report
- [ ] DOCX export (`docx` lib)
- [ ] PDF export (Playwright `page.pdf()`)
- [ ] Heading outline / quick-jump sidebar

**Gate P2 — PASS when:**
- [ ] New doc → template → agent writes markdown → preview renders
- [ ] CodeMirror edit updates preview live
- [ ] Chat regenerates/edits the doc
- [ ] DOCX + PDF export download correctly

---

## 🔲 **PHASE 3 — Sheet Mode**

- [ ] Agent generates sheet JSON → `Fragment.files` as `sheet.json`
- [ ] Glide Data Grid render + HyperFormula formula evaluation
- [ ] Templates: budget / tracker / inventory / blank
- [ ] XLSX export (`xlsx` lib)
- [ ] Formula bar editing + column type editing via Properties

**Gate P3 — PASS when:**
- [ ] New sheet → template → agent produces JSON → grid renders
- [ ] Formulas evaluate (SUM etc.) via HyperFormula
- [ ] Cell edits update in place
- [ ] Chat regenerates/edits sheet data
- [ ] XLSX export downloads and opens correctly

---

## 🔲 **PHASE 4 — Deep Research Mode**

- [ ] Multi-agent iterative refinement pipeline (agent-kit pattern from `ai-contract-generator.ts`)
- [ ] Tavily search + Playwright page scraping
- [ ] Progress via `BuildJob`
- [ ] Read-only report viewer + phase stepper + sources list
- [ ] PDF export (Playwright `page.pdf()`)
- [ ] No block canvas (viewer only)

**Gate P4 — PASS when:**
- [ ] Prompt → phases progress visibly → report + citations produced
- [ ] Follow-up questions refine the report
- [ ] PDF export downloads

---

## 🔲 **PHASE 5 — Wiring & Regression**

- [ ] `(modes)/layout.tsx` mode-aware dispatch → Inngest `modes/run` fn
- [ ] Sidebar nav: Documents/Sheets dead links fixed; add Slides + Deep Research
- [ ] tRPC + TanStack Query integration
- [ ] Run `prisma generate`, `tsc` typecheck, `lint`
- [ ] Regression: website builder + contract builder still pass existing suite

**Gate P5 — PASS when:**
- [ ] All 4 modes navigable from sidebar
- [ ] Full manual pass of each mode's gate checklist
- [ ] Existing builders unaffected (COMPLETE_TEST_SUITE.md passes)

---

## 📦 **Dep/Schema Summary**
- Env: `AI_PROVIDER`, `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`, `TAVILY_API_KEY`
- Schema: `Fragment.sandboxUrl?`, `Fragment.mode?`, `Fragment.meta?`
- NPM: glide-data-grid, hyperformula, @uiw/react-codemirror, @codemirror/lang-markdown, react-markdown, remark-gfm, rehype-highlight, docx, xlsx
- Sandbox: python-pptx, pypdf
