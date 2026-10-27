"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";

/** localStorage key written by Settings → Privacy. Read on load, so a change applies on the next page view. */
export const ANALYTICS_OPT_OUT_KEY = "cobentt-analytics-opt-out";

/** Loads Vercel Analytics unless the visitor has opted out in Settings → Privacy. */
export function OptionalAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    try {
      setEnabled(localStorage.getItem(ANALYTICS_OPT_OUT_KEY) !== "true");
    } catch {
      // Storage blocked: keep analytics off rather than ignore a possible opt-out.
      setEnabled(false);
    }
  }, []);

  return enabled ? <Analytics /> : null;
}
