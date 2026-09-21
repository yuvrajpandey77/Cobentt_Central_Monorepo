import {
  CONFIDENCE,
  capabilityFromMode,
  type CapabilityId,
  type IntentKind,
  type IntentResult,
  type OutputType,
  type PlanStep,
  type RouterInput,
} from "./types";
import { CAPABILITIES_BY_ID, isAvailable } from "./capabilities";

/**
 * Intent Router — semantic-first, keyword-assisted, never keyword-ruled.
 *
 * Pipeline: normalize → explicit-override check → context resolution →
 * capability scoring (action/object/output/temporal/file/context features) →
 * negation & semantic-override pass → multi-capability planning →
 * availability validation → confidence calibration → UX decision.
 *
 * Keywords are supporting signals with small weights; the semantic-override
 * pass can veto them (e.g. "explain what 'latest' means" ≠ web search).
 */

// ---------------------------------------------------------------------------
// Normalization + helpers
// ---------------------------------------------------------------------------

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

interface Scored {
  id: CapabilityId;
  score: number;
  evidence: string[];
}

// ---------------------------------------------------------------------------
// Priority 1: explicit user instructions (never silently contradicted)
// ---------------------------------------------------------------------------

const NO_WEB = [
  /\bdo\s*not\s+search\b/i,
  /\bdon't\s+search\b/i,
  /\bno\s+web\b/i,
  /\bwithout\s+(the\s+)?web\b/i,
  /\boffline\b/i,
  /\bfrom\s+(the\s+)?(context|info(rmation)?)\s+(i\s+)?(gave|provided|above)/i,
  /\buse\s+only\s+(what|the)\s+i\s+(gave|provided)/i,
];
const FORCE_WEB = [
  /\bsearch\s+(the\s+)?web\b/i,
  /\blook\s+(this|it|that)\s+up\b/i,
  /\buse\s+the\s+web\b/i,
  /\bwith\s+sources\b/i,
  /\bcite\s+(your\s+)?sources\b/i,
];
const NO_ARTIFACT = [/\bjust\s+(chat|answer|tell\s+me)\b/i, /\bno\s+(slides|deck|document|pdf|excel|sheet)\b/i];

function detectExplicitTextOverride(message: string): { noWeb: boolean; forceWeb: boolean; noArtifact: boolean } {
  return {
    noWeb: hasAny(message, NO_WEB),
    forceWeb: hasAny(message, FORCE_WEB),
    noArtifact: hasAny(message, NO_ARTIFACT),
  };
}

// ---------------------------------------------------------------------------
// Conversation context: pronouns + follow-up inheritance
// ---------------------------------------------------------------------------

const FOLLOW_UP_ARTIFACT = [
  /\b(now\s+)?make\s+(slides|a\s+deck|a\s+presentation)\b/i,
  /\bturn\s+(this|that|it)\s+into\s+(a\s+)?(deck|slides|presentation|pdf|doc|report|sheet|dashboard)\b/i,
  /\bexport\s+(this|that|it)\b/i,
  /\bfrom\s+(that|this|the\s+(research|analysis|above))\b/i,
  /\bfrom\s+that\b/i,
];
const PRONOUN_ONLY = /^(now\s+)?(make|turn|convert|export|put)\s+(it|this|that|them)\b/i;

function resolveContext(message: string, input: RouterInput): { inherited: boolean; hint: string | null } {
  const text = norm(message);
  const short = text.length < 80;
  const hasPronoun = /\b(it|this|that|them|the\s+(above|research|analysis|report|result))\b/.test(text);
  const looksFollowUp =
    hasAny(message, FOLLOW_UP_ARTIFACT) || (short && hasAny(message, [PRONOUN_ONLY]));
  if (!looksFollowUp) return { inherited: false, hint: null };
  const priorCaps = input.priorIntent?.capabilities ?? [];
  const historyText = (input.history ?? []).slice(-4).map((m) => m.content).join(" ").toLowerCase();
  const historyHadResearch =
    priorCaps.includes("web_search") ||
    priorCaps.includes("deep_research") ||
    /research|report|competitor|source/i.test(historyText);
  if (hasPronoun && (historyHadResearch || (input.history ?? []).length > 0)) {
    return { inherited: true, hint: historyHadResearch ? "prior research context" : "prior conversation context" };
  }
  return { inherited: false, hint: null };
}

// ---------------------------------------------------------------------------
// Semantic feature extractors (each returns score delta + evidence)
// ---------------------------------------------------------------------------

interface Feature {
  caps: CapabilityId[];
  weight: number;
  evidence: string;
  test: (text: string, input: RouterInput) => boolean;
}

/** Action verbs: strong intent signals. Verb and target may have words between them ("put this into Excel"). */
const ACTION_FEATURES: Feature[] = [
  { caps: ["slides"], weight: 0.5, evidence: "presentation action", test: (t) => /\b(make|create|generate|build|draft|prepare|need|want)\b[^.?!]{0,40}\b(slides?|deck|pitch deck|powerpoint|pptx?|presentation|carousel)\b/.test(t) || /\b(slides?|deck|powerpoint|pptx?|pitch deck)\b/.test(t) && /\b(investor|pitch|board|meeting|investor deck)\b/.test(t) },
  { caps: ["slides"], weight: 0.32, evidence: "deck noun", test: (t) => /\b(10-slide|12-slide|\d+\s*-?\s*slide|investor deck|pitch deck|slide deck)\b/.test(t) },
  { caps: ["slides"], weight: 0.3, evidence: "presentable artifact cue", test: (t) => /\b(something|anything|this|that|it)\b[^.?!]{0,30}\b(i can|could|to)\b[^.?!]{0,20}\bpresent\b/.test(t) },
  { caps: ["document"], weight: 0.48, evidence: "document action", test: (t) => /\b(make|create|generate|write|draft|export|convert|turn|put)\b[^.?!]{0,40}\b(pdf|report|document|docx?|ebook|whitepaper|proposal|memo|resume|contract|letter|paper)\b/.test(t) },
  { caps: ["document"], weight: 0.3, evidence: "pdf/export request", test: (t) => /\b(into|as|to)\s+(a\s+)?pdf\b/.test(t) || /\bexport\b[^.?!]{0,20}\bpdf\b/.test(t) },
  { caps: ["sheet"], weight: 0.48, evidence: "spreadsheet action", test: (t) => /\b(make|create|generate|build|put|export|convert|turn)\b[^.?!]{0,40}\b(excel|spreadsheet|sheet|workbook|xlsx|csv|tracker|budget)\b/.test(t) },
  { caps: ["data_analysis", "files"], weight: 0.45, evidence: "data analysis action", test: (t) => /\b(analy[sz]e|analysis|visualiz|chart|graph|plot|dashboard|forecast|insight|compare)\b[^.?!]{0,50}\b(data|dataset|csv|file|spreadsheet|sales|metric|them|this|that|it)\b/.test(t) || /\b(create|make|build)\b[^.?!]{0,30}\b(chart|graph|dashboard)\b/.test(t) },
  { caps: ["image"], weight: 0.45, evidence: "image action", test: (t) => /\b(create|generate|make|draw|design)\b[^.?!]{0,40}\b(image|picture|photo|illustration|logo|diagram|flowchart|infographic|thumbnail)\b/.test(t) },
  { caps: ["writing"], weight: 0.4, evidence: "writing action", test: (t) => /\b(write|draft|compose)\b[^.?!]{0,40}\b(email|message|letter|cover letter|blog|post|copy|newsletter|reply)\b/.test(t) },
  { caps: ["code"], weight: 0.42, evidence: "code action", test: (t) => /\b(build|create|write|generate|deploy|scaffold)\b[^.?!]{0,40}\b(app|website|web ?app|dapp|smart contract|contract|token|nft|component|api|function|script|code)\b/.test(t) },
  { caps: ["knowledge"], weight: 0.42, evidence: "connected-docs request", test: (t) => /\b(search|find|look (in|through))\b[^.?!]{0,40}\b(my|connected|uploaded|previous|existing)\b[^.?!]{0,40}\b(doc|file|knowledge|notes|architecture|report)\b/.test(t) || /\b(my|our)\s+(docs|documents|files|knowledge)\b/.test(t) || /\bconnected\s+(docs|documents)\b/.test(t) },
  { caps: ["deep_research"], weight: 0.42, evidence: "deep research action", test: (t) => /\b(research|deep dive|investigate|competitor|market analysis|comprehensive|in.?depth|sourced comparison)\b/.test(t) && /\b(research|report|analy|compar|market|competitor|sourced|comprehensive|deep)\b/.test(t) && t.length > 30 },
  { caps: ["web_search"], weight: 0.32, evidence: "lookup action", test: (t) => /\b(search|find|look up|check|lookup|google)\b[^.?!]{0,30}\b(for|the|latest|price|docs|website|web)\b/.test(t) },
];

/** Temporal / freshness signals — support, never decide alone. */
const FRESHNESS = [
  /\blatest\b/, /\brecent\b/, /\bcurrent(ly)?\b/, /\btoday\b/, /\bthis week\b/, /\bthis month\b/,
  /\bright now\b/, /\bprice\b/, /\bnews\b/, /\bhappening\b/, /\brelease(d|s)?\b/, /\bversion\b/,
  /\bwhat happened\b/, /\bnewest\b/, /\bup.?to.?date\b/, /\b202[5-9]\b/, /\byesterday\b/,
];

/** Meta-discussion veto: talking ABOUT a word ≠ requesting that capability. */
const META_VETO = [
  /explain what .* means/i,
  /what does .* mean/i,
  /define /i,
  /grammar/i,
  /synonym/i,
  /based on (the )?(information|context|text|content) i gave/i,
  /summariz(e|ing) (this|the|our|my)/i,
  /above/i,
];

/** Static / timeless knowledge — model can answer directly. */
const TIMELESS = [
  /explain (tcp|ip|http|dns|how .* works)/i,
  /what is (a |an )?(function|variable|loop|algorithm|protocol)/i,
  /tutorial/i,
  /how do i (write|use|make) (a |an )?[^?]* (function|loop|component)/i,
];

function scoreWebFreshness(text: string, input: RouterInput): { score: number; evidence: string[] } {
  const ev: string[] = [];
  let s = 0;
  const freshHits = FRESHNESS.filter((p) => p.test(text));
  if (freshHits.length > 0) {
    s += 0.26 + Math.min(0.14, 0.05 * freshHits.length);
    ev.push(`freshness markers (${freshHits.length})`);
  }
  if (/\b(what'?s|what is)\b[^.?!]{0,30}\bhappening\b/.test(text)) { s += 0.3; ev.push("happening-now question"); }
  if (/\b(who is|who's) the (current|new|latest)\b/.test(text)) { s += 0.3; ev.push("changeable office-holder question"); }
  if (/\b(current|today'?s|live)\b[^.?!]{0,25}\b(price|stock|rate|value|bitcoin|eth|nvidia)\b/.test(text)) { s += 0.3; ev.push("live price/fact question"); }
  if (/\bwhat is the current\b/.test(text)) { s += 0.3; ev.push("current-fact question"); }
  if (/\b(compare|vs\.?|versus)\b[^.?!]{0,30}\b(today|current|latest|price)\b/.test(text)) { s += 0.25; ev.push("temporal comparison"); }
  if (/\b(documentation|docs|changelog|github|release notes|release)\b/.test(text) && /latest|current|recent|new/.test(text)) { s += 0.28; ev.push("latest-docs/release request"); }
  if (/\b(competitors?|market|landscape)\b/.test(text) && /\b(research|latest|compare|analysis)\b/.test(text)) { s += 0.2; ev.push("research-grade comparison"); }
  if (input.hasAttachments && /compar|against|with (my|this|the)/.test(text)) { s += 0.12; ev.push("web+file comparison cue"); }
  // Semantic vetoes
  if (hasAny(text, META_VETO)) { s -= 0.55; ev.push("meta-discussion veto (talking about, not asking for)"); }
  if (hasAny(text, TIMELESS) && freshHits.length === 0) { s -= 0.3; ev.push("timeless knowledge veto"); }
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no)\b/.test(text) && text.length < 30) { s -= 0.4; ev.push("greeting veto"); }
  return { score: Math.max(-0.5, s), evidence: ev };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function baseScores(): Record<CapabilityId, Scored> {
  // Chat is the safe fallback by decision rule (low confidence → chat), not by
  // outscoring: keep its prior low so any genuine signal wins outright.
  const ids: CapabilityId[] = ["chat", "web_search", "deep_research", "slides", "document", "sheet", "data_analysis", "image", "code", "files", "knowledge", "writing"];
  return Object.fromEntries(ids.map((id) => [id, { id, score: id === "chat" ? 0.12 : 0, evidence: id === "chat" ? ["safe default prior"] : [] }])) as Record<CapabilityId, Scored>;
}

function applyFeatures(text: string, input: RouterInput, scores: Record<CapabilityId, Scored>): void {
  for (const f of ACTION_FEATURES) {
    let hit = false;
    try { hit = f.test(text, input); } catch { hit = false; }
    if (hit) for (const c of f.caps) { scores[c].score += f.weight; scores[c].evidence.push(f.evidence); }
  }
  // File signals
  if (input.hasAttachments || /\b(this|my|the|uploaded|attached)\b[^.?!]{0,20}\b(csv|file|dataset|data|spreadsheet|pdf|doc)\b/.test(text) || (/\banalyze\b/.test(text) && /\bdata\b/.test(text))) {
    scores.files.score += input.hasAttachments ? 0.4 : 0.18;
    scores.files.evidence.push(input.hasAttachments ? "attachments present" : "file reference");
    if (/\b(analy[sz]e|analysis|chart|dashboard|visual|insight|compare)\b/.test(text)) {
      scores.data_analysis.score += input.hasAttachments ? 0.35 : 0.2;
      scores.data_analysis.evidence.push("analysis over user data");
    }
  }
  // Web freshness
  const web = scoreWebFreshness(text, input);
  scores.web_search.score += web.score;
  scores.web_search.evidence.push(...web.evidence.filter((e) => !e.includes("veto")));
  if (web.evidence.some((e) => e.includes("veto"))) {
    scores.web_search.evidence.push(...web.evidence.filter((e) => e.includes("veto")));
  }
  // Research depth
  if (text.length > 60 && /\b(research|comprehensive|thorough|sourced|competitors|landscape|report)\b/.test(text)) {
    scores.deep_research.score += 0.22;
    scores.deep_research.evidence.push("research depth markers");
  }
  if (/\b(10|12|\d+)\s*-?\s*(slide|page|section)/.test(text) && /\bresearch\b/.test(text)) {
    scores.deep_research.score += 0.15;
    scores.deep_research.evidence.push("research+artifact combo cue");
  }
}

// ---------------------------------------------------------------------------
// Intent + plan assembly
// ---------------------------------------------------------------------------

function topCapabilities(scores: Record<CapabilityId, Scored>): Scored[] {
  return Object.values(scores).sort((a, b) => b.score - a.score);
}

function toConfidence(score: number): number {
  // Linear-ish calibration: 0.30 → ~0.67 (web auto), 0.40 → ~0.81 (confirm+),
  // 0.50 → ~0.95 (auto). Chat prior (0.12) → ~0.42, safely below MEDIUM.
  const c = 0.25 + score * 1.4;
  return Math.round(Math.min(0.99, Math.max(0.05, c)) * 100) / 100;
}

const ARTIFACTS: CapabilityId[] = ["slides", "document", "sheet", "data_analysis", "image"];

function deriveIntent(caps: CapabilityId[], requiresWeb: boolean, output: OutputType): IntentKind {
  const set = new Set(caps);
  // "files"/"knowledge" are supporting capabilities — the primary consumer names the intent.
  const primary = caps.find((c) => c !== "files" && c !== "knowledge") ?? caps[0];
  if ((set.has("web_search") || set.has("deep_research")) && set.has("slides")) return "research_and_presentation";
  if ((set.has("web_search") || set.has("deep_research")) && set.has("document")) return "research_and_document";
  if ((set.has("web_search") || set.has("deep_research")) && (set.has("files") || set.has("data_analysis") || set.has("sheet"))) return "web_and_data_comparison";
  if (caps.length >= 2 && primary !== "chat") return "multi_capability";
  switch (primary) {
    case "slides": return "presentation_generation";
    case "document": return requiresWeb ? "research_and_document" : "document_generation";
    case "sheet": return "spreadsheet_work";
    case "data_analysis": return "data_analysis";
    case "image": return "image_generation";
    case "web_search": return "web_lookup";
    case "deep_research": return "deep_research";
    case "knowledge": return "knowledge_retrieval";
    case "files": return "file_analysis";
    case "writing": return "writing_task";
    case "code": return "code_task";
    default: return output === "text" ? "chat" : "ambiguous";
  }
}

function outputFor(caps: CapabilityId[]): OutputType {
  if (caps.includes("slides")) return "pptx";
  if (caps.includes("document")) return "pdf";
  if (caps.includes("sheet")) return "xlsx";
  if (caps.includes("image")) return "png";
  if (caps.includes("data_analysis")) return "dashboard";
  if (caps.includes("code")) return "code";
  return "text";
}

function planFor(caps: CapabilityId[], ctxInherited: boolean): PlanStep[] {
  const plan: PlanStep[] = [];
  if (ctxInherited) plan.push("resolve_context");
  if (caps.includes("knowledge")) plan.push("retrieve_knowledge");
  if (caps.includes("files")) plan.push("analyze_files");
  if (caps.includes("web_search") || caps.includes("deep_research")) {
    plan.push("search_web", "evaluate_sources", "synthesize_research");
  }
  if (caps.includes("slides")) { if (!plan.includes("synthesize_research") && plan.includes("search_web")) void 0; plan.push("generate_content", "create_presentation"); }
  else if (caps.includes("document")) plan.push("generate_content", "create_document");
  else if (caps.includes("sheet")) plan.push("generate_content", "create_spreadsheet");
  else if (caps.includes("data_analysis")) plan.push("generate_content", "create_dashboard");
  else if (caps.includes("image")) plan.push("generate_image");
  else if (caps.includes("writing")) plan.push("write_text");
  else if (caps.includes("code")) plan.push("generate_content");
  else plan.push("answer_chat");
  return [...new Set(plan)];
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function routeIntent(rawInput: RouterInput): IntentResult {
  const message = (rawInput.message ?? "").slice(0, 8000);
  const text = norm(message);
  const available = rawInput.available;
  const override = detectExplicitTextOverride(message);
  const ctx = resolveContext(message, rawInput);

  // --- Priority 2: explicit UI selection always wins (unless impossible) ---
  const uiCap = capabilityFromMode(rawInput.explicitMode ?? undefined)
    ?? (rawInput.explicitSelection && rawInput.explicitSelection !== "none"
      ? (rawInput.explicitSelection as CapabilityId)
      : null);
  if (uiCap && uiCap !== "chat") {
    const avail = isAvailable(uiCap, available);
    const caps: CapabilityId[] = avail ? [uiCap] : ["chat"];
    if ((uiCap === "web_search" || uiCap === "deep_research") && override.noWeb) {
      return finalize({
        intent: "chat", capabilities: ["chat"], requires_web: false,
        reason: "Explicit 'no web' instruction overrides the selected web capability. Staying in chat.",
        evidence: ["explicit no-web instruction", `explicit selection: ${uiCap} (declined)`],
        explicit_override: true,
      }, rawInput, 0.9, ctx.inherited, avail ? [] : [uiCap]);
    }
    return finalize({
      intent: deriveIntent(caps, false, outputFor(caps)),
      capabilities: caps,
      requires_web: uiCap === "web_search" || uiCap === "deep_research",
      reason: `User explicitly selected ${CAPABILITIES_BY_ID[uiCap]?.label ?? uiCap}; honoring explicit selection.`,
      evidence: [`explicit selection: ${uiCap}`],
      explicit_override: true,
    }, rawInput, 0.98, ctx.inherited, avail ? [] : [uiCap]);
  }
  // Explicit "No Web" toggle = explicitSelection "none" with web intent suppressed.
  const webSuppressed = rawInput.explicitSelection === "none" || override.noWeb;

  // --- Score capabilities ---
  const scores = baseScores();
  applyFeatures(text, rawInput, scores);

  // Context inheritance boost: "make slides from that" after research.
  if (ctx.inherited) {
    const artifactHit = ARTIFACTS.find((a) => scores[a].score > 0.15);
    if (artifactHit) {
      scores[artifactHit].score += 0.25;
      scores[artifactHit].evidence.push(`follow-up on ${ctx.hint}`);
    } else if (/\bslide|deck|presentation|ppt\b/.test(text)) {
      scores.slides.score += 0.45;
      scores.slides.evidence.push(`follow-up on ${ctx.hint ?? "prior context"}`);
    } else if (/\bpdf|report|doc\b/.test(text)) {
      scores.document.score += 0.4;
      scores.document.evidence.push(`follow-up on ${ctx.hint ?? "prior context"}`);
    }
  }

  // Connected-docs scope veto: "search MY documents" is knowledge retrieval,
  // not web search — unless the user explicitly asked for the web too.
  if (scores.knowledge.score >= 0.3 && !override.forceWeb) {
    scores.web_search.score = Math.min(scores.web_search.score, 0.2);
    scores.web_search.evidence.push("connected-docs scope veto (private, not web)");
    scores.deep_research.score = Math.min(scores.deep_research.score, 0.2);
  }
  // Force-web text instruction ("search the web", "cite your sources", ...).
  if (override.forceWeb && !override.noWeb) {
    scores.web_search.score += 0.5;
    scores.web_search.evidence.push("explicit search instruction");
  }
  // No-web suppression.
  if (webSuppressed) {
    scores.web_search.score = Math.min(scores.web_search.score, 0.15);
    scores.deep_research.score = Math.min(scores.deep_research.score, 0.15);
    scores.web_search.evidence.push("web suppressed by explicit instruction/selection");
  }
  if (override.noArtifact) {
    for (const a of ARTIFACTS) scores[a].score = Math.min(scores[a].score, 0.2);
  }

  const ranked = topCapabilities(scores);
  const best = ranked[0];

  // --- Multi-capability: primary + strong secondaries ---
  const CONSUMERS: CapabilityId[] = ["slides", "document", "sheet", "data_analysis", "image", "writing", "code", "deep_research", "web_search", "knowledge"];
  const selected: CapabilityId[] = [best.id];
  // "files" is a supporting capability, never a destination: if it scores
  // highest alone, pair it with the strongest consumer that has any signal.
  if (best.id === "files") {
    const consumer = ranked.find((c) => CONSUMERS.includes(c.id) && c.score > 0.12);
    if (consumer) {
      selected.unshift(consumer.id);
    }
  }
  for (const cand of ranked.slice(1)) {
    if (cand.score >= 0.3 && cand.score >= best.score * 0.35) {
      if (cand.id === "chat") continue;
      if (selected.includes(cand.id)) continue;
      // Consumers first, "files" last: files is supporting context and must
      // never crowd out a real consumer (cap below is small).
      if (cand.id === "files") continue;
      selected.push(cand.id);
    }
    if (selected.length >= 4) break;
  }
  // Second pass: supporting "files" context when it has a real signal.
  if (selected.length < 4) {
    const files = ranked.find((c) => c.id === "files");
    if (files && files.score >= 0.3 && files.score >= best.score * 0.35 && !selected.includes("files")) {
      selected.push("files");
    }
  }
  // Order: primary consumer first, "files" last (it is supporting context).
  selected.sort((a, b) => (a === "files" ? 1 : 0) - (b === "files" ? 1 : 0));
  const requiresWeb = selected.includes("web_search") || selected.includes("deep_research");
  const output = outputFor(selected);
  const intent = deriveIntent(selected, requiresWeb, output);

  // Data-analysis without data → ask, don't hallucinate.
  if (selected.includes("data_analysis") && !rawInput.hasAttachments && !/\b(my|this|the|uploaded|attached)\b.*\b(data|csv|file|dataset)\b/.test(text) && !requiresWeb) {
    return finalize({
      intent: "ambiguous", capabilities: ["chat"], requires_web: false,
      reason: "Data analysis requested but no dataset attached or referenced; staying in chat to ask for the data.",
      evidence: ["data_analysis without dataset"],
      clarifying: "Which dataset should I analyze? Attach a CSV/Excel file and I'll dig in.",
    }, rawInput, 0.55, ctx.inherited, []);
  }

  // Confidence + UX decision.
  let confidence = toConfidence(best.score + (selected.length > 1 ? 0.06 : 0));
  if (override.forceWeb || ctx.inherited) confidence = Math.min(0.97, confidence + 0.05);
  if (intent === "ambiguous" || best.id === "chat") confidence = Math.min(confidence, best.score < 0.2 ? 0.4 : 0.55);

  return finalize({
    intent, capabilities: selected[0] === "chat" && selected.length === 1 ? ["chat"] : selected.filter((c) => c !== "chat" || selected.length === 1),
    requires_web: webSuppressed ? false : requiresWeb,
    reason: buildReason(selected, ranked, override, ctx),
    evidence: selected.flatMap((c) => scores[c].evidence).slice(0, 6),
  }, rawInput, confidence, ctx.inherited, []);
}

function buildReason(caps: CapabilityId[], ranked: Scored[], override: ReturnType<typeof detectExplicitTextOverride>, ctx: { inherited: boolean; hint: string | null }): string {
  if (override.noWeb) return "Explicit no-web instruction honored; routing without web retrieval.";
  if (ctx.inherited) return `Follow-up on ${ctx.hint}; routing to ${caps.map((c) => CAPABILITIES_BY_ID[c]?.label ?? c).join(" + ")} with inherited context.`;
  const primary = CAPABILITIES_BY_ID[caps[0]];
  if (caps.length > 1) return `Multi-capability request: ${caps.map((c) => CAPABILITIES_BY_ID[c]?.label ?? c).join(" → ")} pipeline.`;
  if (caps[0] === "chat") return "No specialized capability confidently detected; normal chat is the safe fallback.";
  return `${primary?.label ?? caps[0]} intent detected (${(ranked[0]?.evidence ?? []).slice(0, 2).join("; ") || "semantic match"}).`;
}

function finalize(
  partial: {
    intent: IntentKind; capabilities: CapabilityId[]; requires_web: boolean;
    reason: string; evidence: string[]; explicit_override?: boolean; clarifying?: string;
  },
  input: RouterInput,
  confidence: number,
  inherited: boolean,
  unavailable: CapabilityId[],
): IntentResult {
  let caps = [...partial.capabilities];
  const unavail: CapabilityId[] = [];
  for (const c of caps) {
    if (!isAvailable(c, input.available)) unavail.push(c);
  }
  let fallback: string | undefined;
  if (unavail.length > 0) {
    // Never pretend: drop unavailable, fall back to chat guidance.
    caps = caps.filter((c) => !unavail.includes(c));
    if (caps.length === 0) caps = ["chat"];
    fallback = `${unavail.map((c) => CAPABILITIES_BY_ID[c]?.label ?? c).join(", ")} isn't available in this workspace yet — I'll handle it in chat instead.`;
    confidence = Math.min(confidence, 0.7);
  }
  const requiresFiles = caps.includes("files") || caps.includes("data_analysis");
  const requiresKnowledge = caps.includes("knowledge");
  const output = outputFor(caps);
  const hasArtifact = caps.some((c) => (ARTIFACTS as CapabilityId[]).includes(c));
  const conf = Math.round(Math.min(0.99, Math.max(0.05, confidence)) * 100) / 100;

  let action: IntentResult["action"] = "chat";
  let requires_confirmation = false;
  let auto_after_ms = 0;
  const multi = caps.length > 1;
  if (partial.explicit_override) {
    action = "auto";
  } else if (conf >= CONFIDENCE.HIGH && (hasArtifact || partial.requires_web || multi)) {
    action = "auto";
    if (hasArtifact) auto_after_ms = CONFIDENCE.AUTO_AFTER_MS; // 3s card for artifacts only
  } else if (conf >= CONFIDENCE.MEDIUM && (hasArtifact || multi)) {
    action = "confirm";
    requires_confirmation = true;
  } else if (partial.requires_web && conf >= CONFIDENCE.MEDIUM) {
    action = "auto"; // web enrichment is silent, non-destructive
  } else if (conf >= CONFIDENCE.MEDIUM && caps[0] !== "chat") {
    action = "auto"; // confident single capability (knowledge/writing/code): silent
  } else {
    action = "chat";
    if (!partial.explicit_override && conf < CONFIDENCE.MEDIUM) {
      caps = ["chat"];
    }
  }
  if (partial.clarifying) {
    action = "chat";
    requires_confirmation = false;
    auto_after_ms = 0;
  }

  return {
    intent: action === "chat" && !partial.explicit_override ? (partial.clarifying ? "ambiguous" : (caps[0] === "chat" ? "chat" : partial.intent)) : partial.intent,
    capabilities: caps,
    requires_web: partial.requires_web,
    requires_files: requiresFiles,
    requires_knowledge: requiresKnowledge,
    output_type: output,
    confidence: conf,
    action,
    requires_confirmation,
    auto_after_ms,
    reason: partial.reason,
    evidence: partial.evidence.slice(0, 6),
    execution_plan: partial.clarifying ? ["ask_clarification"] : planFor(caps, inherited),
    explicit_override: partial.explicit_override ?? false,
    context_inherited: inherited,
    clarifying_question: partial.clarifying,
    unavailable: unavailable.length > 0 ? unavailable : unavail,
    fallback_note: fallback,
  };
}

/** Convenience: would normal chat be equally appropriate? (pre-execution check) */
export function isChatEquivalent(result: IntentResult): boolean {
  return result.action === "chat" || (result.confidence < CONFIDENCE.MEDIUM && !result.explicit_override);
}
