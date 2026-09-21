import type { CapabilityId, CapabilityMeta } from "./types";

/**
 * Capability registry — the ONLY place that lists what Cobentt can do.
 * The router never routes to an id that is not registered here, and new
 * capabilities are added by appending an entry (no router rewrite).
 */
export const CAPABILITY_REGISTRY: CapabilityMeta[] = [
  {
    id: "chat",
    label: "Chat",
    description: "Normal model response. No external info, files, or artifacts needed.",
    intents: ["chat", "ambiguous"],
    outputTypes: ["text"],
    requiresExternal: false,
    requiresFiles: false,
    needsConfirmation: false,
    constraints: ["Default safe fallback when confidence is low."],
  },
  {
    id: "web_search",
    label: "Web Search",
    description: "Current, changing, or external public information (news, prices, docs, releases).",
    intents: ["web_lookup", "research_and_presentation", "research_and_document", "web_and_data_comparison", "multi_capability"],
    outputTypes: ["text"],
    requiresExternal: true,
    requiresFiles: false,
    needsConfirmation: false,
    constraints: ["Never fabricate current facts when search fails; disclose the failure."],
  },
  {
    id: "deep_research",
    label: "Deep Research",
    description: "Multi-step research with planning, section writing, and cited sources.",
    intents: ["deep_research", "research_and_presentation", "research_and_document", "multi_capability"],
    outputTypes: ["text"],
    requiresExternal: true,
    requiresFiles: false,
    route: "/deep-research",
    mode: "deep-research",
    needsConfirmation: false,
    constraints: ["Expensive multi-call workflow; prefer web_search for simple lookups."],
  },
  {
    id: "slides",
    label: "Presentations",
    description: "Slide decks / pitch decks / PowerPoint (pptx export).",
    intents: ["presentation_generation", "research_and_presentation", "multi_capability"],
    outputTypes: ["pptx"],
    requiresExternal: false,
    requiresFiles: false,
    route: "/slides",
    mode: "slides",
    needsConfirmation: true,
    constraints: ["Confirm when medium confidence; 3s auto-action only when high confidence."],
  },
  {
    id: "document",
    label: "Documents",
    description: "Reports, docs, PDFs, emails, technical documents (docx/pdf export).",
    intents: ["document_generation", "writing_task", "research_and_document", "multi_capability"],
    outputTypes: ["docx", "pdf", "text"],
    requiresExternal: false,
    requiresFiles: false,
    route: "/document",
    mode: "document",
    needsConfirmation: true,
    constraints: ["'Make this into a PDF' routes here (document workflow + pdf export)."],
  },
  {
    id: "sheet",
    label: "Sheets",
    description: "Spreadsheets, Excel workbooks, trackers, budgets (xlsx export).",
    intents: ["spreadsheet_work", "data_analysis", "web_and_data_comparison", "multi_capability"],
    outputTypes: ["xlsx", "csv"],
    requiresExternal: false,
    requiresFiles: false,
    route: "/sheet",
    mode: "sheet",
    needsConfirmation: true,
    constraints: [],
  },
  {
    id: "data_analysis",
    label: "Data Analysis",
    description: "CSV/dataset analysis, charts, dashboards from uploaded or referenced data.",
    intents: ["data_analysis", "dashboard_generation", "web_and_data_comparison", "multi_capability"],
    outputTypes: ["dashboard", "png", "csv", "text"],
    requiresExternal: false,
    requiresFiles: true,
    needsConfirmation: true,
    constraints: ["Requires user data when no dataset is attached or referenced — ask, don't hallucinate data."],
  },
  {
    id: "image",
    label: "Image Generation",
    description: "Generated images, diagrams, illustrations. Currently served as chat guidance when no generator is wired.",
    intents: ["image_generation", "multi_capability"],
    outputTypes: ["png"],
    requiresExternal: false,
    requiresFiles: false,
    needsConfirmation: true,
    constraints: ["No dedicated image model wired; router must mark unavailable and fall back to chat guidance."],
  },
  {
    id: "code",
    label: "Code",
    description: "Smart contracts, websites, dapps, code generation (project builder).",
    intents: ["code_task", "multi_capability"],
    outputTypes: ["code"],
    requiresExternal: false,
    requiresFiles: false,
    needsConfirmation: false,
    constraints: [],
  },
  {
    id: "files",
    label: "Files",
    description: "User-provided files/data involved in the request (attachments, CSVs, uploads).",
    intents: ["file_analysis", "data_analysis", "web_and_data_comparison", "multi_capability"],
    outputTypes: ["none"],
    requiresExternal: false,
    requiresFiles: true,
    needsConfirmation: false,
    constraints: ["Composer capability, not a destination — always paired with another capability."],
  },
  {
    id: "knowledge",
    label: "Connected Knowledge",
    description: "Search the user's connected documents / prior conversation context.",
    intents: ["knowledge_retrieval", "multi_capability"],
    outputTypes: ["text"],
    requiresExternal: false,
    requiresFiles: false,
    needsConfirmation: false,
    constraints: ["Served from conversation history + attachments until a vector store lands."],
  },
  {
    id: "writing",
    label: "Writing",
    description: "Emails, messages, copy — plain-text writing without a document artifact.",
    intents: ["writing_task", "multi_capability"],
    outputTypes: ["text"],
    requiresExternal: false,
    requiresFiles: false,
    needsConfirmation: false,
    constraints: ["Route to document when user asks for a file/export ('PDF', 'docx')."],
  },
];

export const CAPABILITIES_BY_ID: Record<CapabilityId, CapabilityMeta> = Object.fromEntries(
  CAPABILITY_REGISTRY.map((c) => [c.id, c])
) as Record<CapabilityId, CapabilityMeta>;

/** Capabilities actually wired in this deployment. `image` has no generator yet. */
export const DEFAULT_AVAILABLE: CapabilityId[] = [
  "chat",
  "web_search",
  "deep_research",
  "slides",
  "document",
  "sheet",
  "data_analysis",
  "code",
  "files",
  "knowledge",
  "writing",
];

export function isAvailable(id: CapabilityId, available?: CapabilityId[]): boolean {
  const list = available ?? DEFAULT_AVAILABLE;
  return list.includes(id);
}

export function describeCapability(id: CapabilityId): string {
  return CAPABILITIES_BY_ID[id]?.label ?? id;
}
