import type { CapabilityId, IntentResult } from "./types";

/** One routing decision for observability + evaluation. */
export interface TelemetryEvent {
  id: string;
  at: string;
  intent: IntentResult["intent"];
  capabilities: CapabilityId[];
  confidence: number;
  action: IntentResult["action"];
  explicitSelection: string | null;
  explicitOverride: boolean;
  autoRouted: boolean;
  confirmationShown: boolean;
  userDecision?: "confirmed" | "cancelled" | "auto" | "corrected";
  executionSuccess?: boolean;
  latencyMs?: number;
  messageLength: number;
  requiresWeb: boolean;
  messageHash: string;
}

const BUFFER: TelemetryEvent[] = [];
const MAX = 500;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export function recordRouting(input: {
  message: string;
  result: IntentResult;
  explicitSelection?: string | null;
  confirmationShown?: boolean;
  autoRouted?: boolean;
  latencyMs?: number;
}): TelemetryEvent {
  const ev: TelemetryEvent = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    intent: input.result.intent,
    capabilities: input.result.capabilities,
    confidence: input.result.confidence,
    action: input.result.action,
    explicitSelection: input.explicitSelection ?? null,
    explicitOverride: input.result.explicit_override,
    autoRouted: input.autoRouted ?? input.result.action === "auto",
    confirmationShown: input.confirmationShown ?? input.result.requires_confirmation,
    messageLength: input.message.length,
    requiresWeb: input.result.requires_web,
    messageHash: hash(input.message.toLowerCase().trim()),
  };
  BUFFER.push(ev);
  if (BUFFER.length > MAX) BUFFER.splice(0, BUFFER.length - MAX);
  // Fire-and-forget DB mirror (never blocks routing).
  void persistToAudit(ev).catch(() => {});
  return ev;
}

async function persistToAudit(ev: TelemetryEvent): Promise<void> {
  try {
    const { default: prisma } = await import("@/lib/db");
    // Reuse UserAuditLog table generically — no migration required.
    await prisma.userAuditLog.create({
      data: {
        clerkUserId: "intent-router",
        event: "intent.routed",
        actor: "system",
        details: JSON.parse(JSON.stringify(ev)) as object,
      },
    });
  } catch {
    // Telemetry must never break routing (e.g. DB down in tests).
  }
}

export function recordOutcome(id: string, patch: Partial<Pick<TelemetryEvent, "userDecision" | "executionSuccess">>): void {
  const ev = BUFFER.find((e) => e.id === id);
  if (ev) Object.assign(ev, patch);
}

export function telemetryStats(): {
  total: number;
  autoRate: number;
  confirmRate: number;
  overrideRate: number;
  webRate: number;
  avgConfidence: number;
  byIntent: Record<string, number>;
} {
  const total = BUFFER.length;
  if (total === 0) {
    return { total: 0, autoRate: 0, confirmRate: 0, overrideRate: 0, webRate: 0, avgConfidence: 0, byIntent: {} };
  }
  const byIntent: Record<string, number> = {};
  let auto = 0, confirm = 0, over = 0, web = 0, conf = 0;
  for (const e of BUFFER) {
    byIntent[e.intent] = (byIntent[e.intent] ?? 0) + 1;
    if (e.autoRouted) auto++;
    if (e.confirmationShown) confirm++;
    if (e.explicitOverride) over++;
    if (e.requiresWeb) web++;
    conf += e.confidence;
  }
  return {
    total,
    autoRate: Math.round((auto / total) * 1000) / 1000,
    confirmRate: Math.round((confirm / total) * 1000) / 1000,
    overrideRate: Math.round((over / total) * 1000) / 1000,
    webRate: Math.round((web / total) * 1000) / 1000,
    avgConfidence: Math.round((conf / total) * 1000) / 1000,
    byIntent,
  };
}

export function recentEvents(n = 50): TelemetryEvent[] {
  return BUFFER.slice(-n).reverse();
}
