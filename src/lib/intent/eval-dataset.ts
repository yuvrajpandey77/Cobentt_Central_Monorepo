import type { CapabilityId } from "./types";

/**
 * Evaluation dataset for the intent router.
 * Run: `npx tsx src/lib/intent/eval.ts` (see eval runner below) or import
 * EVALUATION_CASES in tests. Objective: correct automation, not max automation.
 */
export interface EvalCase {
  id: string;
  category: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  hasAttachments?: boolean;
  explicitSelection?: CapabilityId | "none" | null;
  explicitMode?: string | null;
  expect: {
    capabilities: CapabilityId[];
    requires_web?: boolean;
    action?: "auto" | "confirm" | "chat";
    minConfidence?: number;
  };
  notes?: string;
}

export const EVALUATION_CASES: EvalCase[] = [
  // ---- normal chat ----
  { id: "chat-1", category: "chat", message: "Explain TCP/IP", expect: { capabilities: ["chat"] }, notes: "Timeless knowledge, no web." },
  { id: "chat-2", category: "chat", message: "Tell me about React", expect: { capabilities: ["chat"] } },
  { id: "chat-3", category: "chat", message: "Explain what 'latest' means in software releases.", expect: { capabilities: ["chat"] }, notes: "Meta-discussion veto over keyword." },
  { id: "chat-4", category: "chat", message: "Based on the information I gave you above, summarize Cobentt", expect: { capabilities: ["chat"], requires_web: false } },
  { id: "chat-5", category: "chat", message: "Hi, how are you?", expect: { capabilities: ["chat"] } },
  // ---- web research ----
  { id: "web-1", category: "web", message: "What's happening with OpenAI today?", expect: { capabilities: ["web_search"], requires_web: true } },
  { id: "web-2", category: "web", message: "Find the latest NVIDIA H100 pricing", expect: { capabilities: ["web_search"], requires_web: true } },
  { id: "web-3", category: "web", message: "Compare today's Bitcoin price with yesterday", expect: { capabilities: ["web_search"], requires_web: true } },
  { id: "web-4", category: "web", message: "Who is the current CEO of X?", expect: { capabilities: ["web_search"], requires_web: true } },
  { id: "web-5", category: "web", message: "Tell me about the latest React release", expect: { capabilities: ["web_search"], requires_web: true } },
  { id: "web-6", category: "web", message: "Research competitors for Cobentt and give me a sourced comparison", expect: { capabilities: ["web_search"], requires_web: true }, notes: "deep_research also accepted (web substitute)." },
  { id: "web-7", category: "web", message: "What is the current NVIDIA stock price?", expect: { capabilities: ["web_search"], requires_web: true } },
  // ---- artifacts ----
  { id: "slides-1", category: "slides", message: "Make me a 10-slide investor pitch deck for Cobentt", expect: { capabilities: ["slides"], action: "auto" } },
  { id: "slides-2", category: "slides", message: "Create a PowerPoint about our company", expect: { capabilities: ["slides"] } },
  { id: "doc-1", category: "document", message: "Make this into a PDF", expect: { capabilities: ["document"] } },
  { id: "doc-2", category: "document", message: "Create a PDF report", expect: { capabilities: ["document"] } },
  { id: "doc-3", category: "writing", message: "Write an email to the investor", expect: { capabilities: ["writing", "document"] }, notes: "Either writing or document acceptable." },
  { id: "sheet-1", category: "sheet", message: "Put this into Excel", expect: { capabilities: ["sheet"] } },
  { id: "data-1", category: "data", message: "Analyze this CSV", hasAttachments: true, expect: { capabilities: ["data_analysis"] } },
  { id: "data-2", category: "data", message: "Create a dashboard from this dataset", hasAttachments: true, expect: { capabilities: ["data_analysis"] } },
  { id: "data-3", category: "data", message: "Create a chart from this", hasAttachments: true, expect: { capabilities: ["data_analysis"] } },
  { id: "image-1", category: "image", message: "Create an image of a sunset over mountains", expect: { capabilities: ["chat"] }, notes: "No generator wired → chat fallback with note is correct." },
  // ---- knowledge ----
  { id: "know-1", category: "knowledge", message: "Search my connected documents for the previous architecture", expect: { capabilities: ["knowledge"] } },
  // ---- multi-capability ----
  { id: "multi-1", category: "multi", message: "Research the latest AI competitors and create a 10-slide investor deck.", expect: { capabilities: ["web_search", "slides"], requires_web: true } },
  { id: "multi-2", category: "multi", message: "Search the web for the latest NVIDIA GPUs, compare them with my uploaded CSV, and create a report.", hasAttachments: true, expect: { capabilities: ["web_search", "document"], requires_web: true } },
  { id: "multi-3", category: "multi", message: "Research the latest AI coding tools and create a presentation", expect: { capabilities: ["web_search", "slides"], requires_web: true } },
  // ---- ambiguous ----
  { id: "amb-1", category: "ambiguous", message: "Can you organize this information nicely?", expect: { capabilities: ["chat"], action: "chat" }, notes: "Must not aggressively route." },
  { id: "amb-2", category: "ambiguous", message: "Could you turn this into something I can present?", expect: { capabilities: ["slides", "chat"] }, notes: "Medium confidence → confirm card or chat." },
  // ---- overrides ----
  { id: "over-1", category: "override", message: "What's the latest NVIDIA stock price? Do not search the web.", expect: { capabilities: ["chat"], requires_web: false }, notes: "Explicit instruction wins." },
  { id: "over-2", category: "override", message: "What's the latest NVIDIA stock price?", explicitSelection: "none", expect: { capabilities: ["chat"], requires_web: false }, notes: "Explicit No-Web toggle wins." },
  // ---- context ----
  { id: "ctx-1", category: "context", message: "Now make slides from that.", history: [{ role: "user", content: "Research OpenAI's latest models." }, { role: "assistant", content: "Here is the research…" }], expect: { capabilities: ["slides"] }, notes: "Inherits research context." },
  { id: "ctx-2", category: "context", message: "Take the analysis above and export it.", history: [{ role: "assistant", content: "Analysis: revenue grew 20%…" }], expect: { capabilities: ["document", "slides", "chat"] }, notes: "Any artifact route acceptable; must not lose context." },
];
