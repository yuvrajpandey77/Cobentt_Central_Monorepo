import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { routeIntent } from "@/lib/intent/router";
import { DEFAULT_AVAILABLE, type CAPABILITY_REGISTRY } from "@/lib/intent/capabilities";
import { recordRouting } from "@/lib/intent/telemetry";
import type { CapabilityId } from "@/lib/intent/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  message: z.string().min(1).max(8000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(10).optional(),
  priorIntent: z.unknown().optional(),
  explicitSelection: z.string().nullable().optional(),
  explicitMode: z.string().nullable().optional(),
  hasAttachments: z.boolean().optional(),
  attachmentNames: z.array(z.string()).max(20).optional(),
});

const VALID_SELECTIONS = new Set([...DEFAULT_AVAILABLE.map(String), "none"]);

/**
 * POST /api/intent/route — stateless routing decision.
 * Auth optional (chat page requires sign-in anyway); rate-limited client-side
 * by debounce + server-side by the chat pipeline on execution.
 */
export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "message is required (1-8000 chars)" }, { status: 400 });
  }
  const b = parsed.data;

  const explicitSelection = b.explicitSelection && VALID_SELECTIONS.has(b.explicitSelection)
    ? (b.explicitSelection as CapabilityId | "none")
    : null;

  const result = routeIntent({
    message: b.message,
    history: b.history,
    priorIntent: (b.priorIntent as never) ?? null,
    explicitSelection,
    explicitMode: b.explicitMode ?? null,
    hasAttachments: b.hasAttachments ?? false,
    attachmentNames: b.attachmentNames ?? [],
  });

  const telemetry = recordRouting({
    message: b.message,
    result,
    explicitSelection,
    confirmationShown: result.requires_confirmation,
    autoRouted: result.action === "auto",
    latencyMs: Date.now() - started,
  });

  return NextResponse.json({ ...result, telemetryId: telemetry.id });
}

export async function GET() {
  // Expose the registry so clients never hardcode capability lists.
  const { CAPABILITY_REGISTRY: reg } = await import("@/lib/intent/capabilities");
  return NextResponse.json({
    capabilities: reg.map((c: (typeof CAPABILITY_REGISTRY)[number]) => ({
      id: c.id, label: c.label, description: c.description,
      route: c.route ?? null, mode: c.mode ?? null,
      needsConfirmation: c.needsConfirmation,
    })),
    available: DEFAULT_AVAILABLE,
  });
}
