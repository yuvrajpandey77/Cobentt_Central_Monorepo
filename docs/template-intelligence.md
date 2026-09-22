# Template Intelligence Layer

Visual-grammar / presentation-compiler layer on top of the existing 11-phase
slide pipeline. The AI selects **visual systems** (references + grammars) by
content — never "template #7" — and adapts them per slide.

## 1. Architecture

```
setup (style override) → planner (story/purpose/density/layout/visual)
  → direction (primary + secondary systems)
  → per-slide selection (scored, diversified, explained)
  → asset resolution → composer (copy + templateId + treatment)
  → evaluator → targeted repair → render (existing canvas/exporters)
```

Modules (`src/lib/templates/`): `types` (schema) → `registry` (15 systems)
→ `analyzer` (CSS token extraction for ingestion) → `scorer` (deterministic
0..1) → `retriever` (filter → score → diversify → top N) → `selector`
(3 levels + intent mapping) → `adapter` (normalize → app theme/layout).
`index` re-exports + the `TEMPLATE_INTELLIGENCE_ENABLED` kill switch.

Disabled (`TEMPLATE_INTELLIGENCE_ENABLED=false`): selector skipped, composer
prompt identical to before — old behavior byte-for-byte.

## 2. Template schema

`PresentationTemplate`: id/name/version, `source` (type/url/license —
github + reference records carry real MIT URLs; generated records are
original grammars, no third-party code), `categories` (20-way), `visualStyle`
(mood/energy/density + 6 scored axes), `typography`, `colorSystem`,
`layoutPatterns` (20-way grammar), `supportedSlidePurposes`,
`visualNeeds`, `preferredContentDensity`, `supportedAspectRatios`,
`characteristics`, `bestFor`/`avoidFor`, `tags`, `appMapping`
(themeId → guaranteed dynamic theme + layoutBoost + accentTreatment),
`compatibleWith`, plus reserved `embedding` and `visualFingerprint` slots
for future vector/screenshot retrieval.

## 3. Scoring algorithm

Deterministic weighted sum (0..1): purpose .25 + density .15 + visualNeed
.15 + category .15 + layout .10 + mood .05 + content .05 + aspect .05,
minus incompatibility (.5) and diversity (0…​.3) penalties. Every score
carries human-readable `reasons`. Explicit `preferredCategories` constrain
the pool outright — user override always wins.

## 4. Retrieval

`retrieveTemplates(ctx, {limit})`: hard-filter excluded categories/aspect →
score all eligible → stable sort → greedy diversification (fresh + low
category-overlap preferred) → backfill → top N `ScoredTemplate`s.

## 5. Template ingestion

1. Confirm the source license permits reuse (MIT/Apache/CC0 or original).
2. If yes and useful, vendor minimal assets; otherwise `reference-only`
   (url + license metadata, no code).
3. Run `npm run templates:analyze` thinking via `analyzeCss` on its
   stylesheets (colors, fonts, radii, patterns, motion hints).
4. Author the normalized record in `src/lib/templates/registry.ts`.
5. `npm run templates:validate && npm run templates:test`.

## 6. Licensing

Every record stores `source.type/url/license`. Only MIT (reveal.js,
impress.js) references are bundled as pointers; everything else is an
original grammar. Never paste proprietary template code into the repo.

## 7. Adding a new template

Add a record → validate → test → `templates:index` regenerates
`data/presentation-templates/registry.json`. No generation-logic changes
needed; scoring picks it up automatically.

## 8. Debugging selection

- Dev inspector: `GET /api/templates/inspect?purpose=hook&density=sparse&tone=investor`
  (non-production only) — registry status, direction, ranked picks with
  scores + reasons, slide pick, and the composer context preview.
- Server logs: `[modes/generate] template direction: …`.
- Blocks carry `templateId` (explainability; renderer ignores it).

## 9. Testing

`npm run templates:test` — 36 checks: registry validity, scoring
(investor/technical/editorial bias), diversity penalty, compatibility
ordering, override-wins, direction/selection explained, rotation, and 15
golden scenarios asserting compatibility properties (never a hard-coded
single winner).

## 10. Future vector retrieval

`embedding?: number[]` and `visualFingerprint` already exist on the schema.
When embeddings land, add a semantic pre-filter before deterministic
scoring — no schema migration required.

## How AI should use templates

- Planner owns story/purpose/density/layout/visual-need.
- Selector assigns one system per slide + deck direction; composer receives
  the compact context (§15 format) plus per-slide `template {id, treatment}`.
- Composer copies `template.id` onto each block as `templateId` and follows
  the treatment hint for typography/metrics/cards/borders.
- Example: traction slide (4 metrics, sparse, investor) → Signal grammar →
  metric-grid family, tabular oversized numerals, hairline rules — while the
  neighboring product slide uses Studio grammar with a media-split.
- Never: same system + same layout twice in a row; decorative images;
  invented asset URLs; proprietary copies.
