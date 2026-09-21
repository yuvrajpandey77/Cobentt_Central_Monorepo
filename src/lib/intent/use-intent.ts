"use client";

import { useCallback, useRef, useState } from "react";
import type { IntentResult } from "@/lib/intent/types";

/**
 * Client hook for the intent router.
 * - Debounce-free: call `classify` explicitly on submit (cheap, ~1-5ms server).
 * - Returns the routing decision + telemetry id for outcome reporting.
 */
export function useIntentRouter() {
  const [pending, setPending] = useState<{ result: IntentResult; telemetryId?: string } | null>(null);
  const [classifying, setClassifying] = useState(false);
  const seq = useRef(0);

  const classify = useCallback(async (input: {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    explicitSelection?: string | null;
    explicitMode?: string | null;
    hasAttachments?: boolean;
    attachmentNames?: string[];
  }): Promise<{ result: IntentResult; telemetryId?: string } | null> => {
    const my = ++seq.current;
    setClassifying(true);
    try {
      const res = await fetch("/api/intent/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (seq.current !== my) return null; // stale
      const { telemetryId, ...result } = data as IntentResult & { telemetryId?: string };
      return { result: result as IntentResult, telemetryId };
    } catch {
      return null; // router failure → safe fallback: normal chat
    } finally {
      if (seq.current === my) setClassifying(false);
    }
  }, []);

  const clear = useCallback(() => setPending(null), []);

  return { pending, setPending, classifying, classify, clear };
}
