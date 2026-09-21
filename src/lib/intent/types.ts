import { z } from "zod";

/** Stable capability identifiers. New capabilities plug in via the registry. */
export const CapabilityIdSchema = z.enum([
  "chat",
  "web_search",
  "deep_research",
  "slides",
  "document",
  "sheet",
  "data_analysis",
  "image",
  "code",
  "files",
  "knowledge",
  "writing",
]);
export type CapabilityId = z.infer<typeof CapabilityIdSchema>;

export const OutputTypeSchema = z.enum([
  "text",
  "pptx",
  "pdf",
  "docx",
  "xlsx",
  "png",
  "csv",
  "json",
  "code",
  "dashboard",
  "none",
]);
export type OutputType = z.infer<typeof OutputTypeSchema>;

/** Single step in an execution plan. Order matters. */
export const PlanStepSchema = z.enum([
  "resolve_context",
  "search_web",
  "evaluate_sources",
  "synthesize_research",
  "analyze_files",
  "retrieve_knowledge",
  "generate_content",
  "create_presentation",
  "create_document",
  "create_spreadsheet",
  "create_dashboard",
  "generate_image",
  "write_text",
  "answer_chat",
  "ask_clarification",
]);
export type PlanStep = z.infer<typeof PlanStepSchema>;

export const IntentKindSchema = z.enum([
  "chat",
  "web_lookup",
  "deep_research",
  "presentation_generation",
  "document_generation",
  "spreadsheet_work",
  "data_analysis",
  "image_generation",
  "writing_task",
  "code_task",
  "file_analysis",
  "knowledge_retrieval",
  "dashboard_generation",
  "research_and_presentation",
  "research_and_document",
  "web_and_data_comparison",
  "multi_capability",
  "ambiguous",
]);
export type IntentKind = z.infer<typeof IntentKindSchema>;

/**
 * Structured internal representation of a routing decision.
 * Kept internal + strongly typed; never shown raw to the user.
 */
export const IntentResultSchema = z.object({
  intent: IntentKindSchema,
  capabilities: z.array(CapabilityIdSchema).min(1),
  requires_web: z.boolean(),
  requires_files: z.boolean(),
  requires_knowledge: z.boolean(),
  output_type: OutputTypeSchema,
  confidence: z.number().min(0).max(1),
  /** UX decision derived from confidence + policy. */
  action: z.enum(["auto", "confirm", "chat"]),
  requires_confirmation: z.boolean(),
  /** Auto-action countdown ms for high-confidence artifact routes (0 = none). */
  auto_after_ms: z.number().int().min(0).default(0),
  reason: z.string(),
  evidence: z.array(z.string()).default([]),
  execution_plan: z.array(PlanStepSchema),
  /** When true, an explicit user instruction/selection decided the route. */
  explicit_override: z.boolean().default(false),
  /** Follow-up inheriting prior context (e.g. "now make slides from that"). */
  context_inherited: z.boolean().default(false),
  clarifying_question: z.string().optional(),
  /** Capability requested but unavailable in this deployment. */
  unavailable: z.array(CapabilityIdSchema).default([]),
  fallback_note: z.string().optional(),
});
export type IntentResult = z.infer<typeof IntentResultSchema>;

export interface RouterInput {
  message: string;
  /** Recent conversation turns for context resolution (oldest → newest). */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Prior routing decision in this conversation, if any. */
  priorIntent?: IntentResult | null;
  /** Capability the user explicitly selected in the UI (tool selector / mode pill). */
  explicitSelection?: CapabilityId | "none" | null;
  /** Free-form mode id from ModeProvider ("chat" | "slides" | ...). */
  explicitMode?: string | null;
  hasAttachments?: boolean;
  attachmentNames?: string[];
  /** Capabilities actually available in this deployment. */
  available?: CapabilityId[];
}

export interface CapabilityMeta {
  id: CapabilityId;
  label: string;
  description: string;
  /** Intents this capability can satisfy. */
  intents: IntentKind[];
  outputTypes: OutputType[];
  requiresExternal: boolean;
  requiresFiles: boolean;
  /** Route to navigate to for artifact modes (chat stays in place). */
  route?: string;
  /** Mode id used by /api/modes/* and conversation.mode. */
  mode?: string;
  needsConfirmation: boolean;
  constraints: string[];
}

/** Confidence policy — single source of truth for UX thresholds. */
export const CONFIDENCE = {
  /** >= HIGH → auto-route (lightweight 3s card for artifacts, silent for web). */
  HIGH: 0.85,
  /** >= MEDIUM → confirmation card, wait for user. */
  MEDIUM: 0.6,
  /** < MEDIUM → safe fallback: normal chat. */
  AUTO_AFTER_MS: 3000,
} as const;

export const ROUTE_MODE_MAP: Record<string, CapabilityId> = {
  chat: "chat",
  slides: "slides",
  document: "document",
  docs: "document",
  sheet: "sheet",
  "deep-research": "deep_research",
  deep_research: "deep_research",
  website: "chat",
  "smart-contract": "code",
};

export function capabilityFromMode(mode?: string | null): CapabilityId | null {
  if (!mode) return null;
  return ROUTE_MODE_MAP[mode] ?? null;
}
