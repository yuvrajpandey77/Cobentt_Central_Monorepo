"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJson } from "@/lib/safe-fetch-json";

export interface ByokKeyMeta {
  id: string;
  provider: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

interface ByokStatus {
  hasKey: boolean;
  canUseServerKey: boolean;
  providers: string[];
  keys: ByokKeyMeta[];
}

export function useByok() {
  const [status, setStatus] = useState<ByokStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { ok, data } = await fetchJson<ByokStatus>("/api/byok/status", { cache: "no-store" });
      if (!ok || !data) return;
      setStatus({
        hasKey: !!data.hasKey,
        canUseServerKey: !!data.canUseServerKey,
        providers: data.providers ?? [],
        keys: data.keys ?? [],
      });
    } catch {
      // Gate stays closed on network failure — harness will surface BYOK_REQUIRED.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    hasKey: status?.hasKey ?? false,
    canUseServerKey: status?.canUseServerKey ?? false,
    providers: status?.providers ?? [],
    keys: status?.keys ?? [],
    loading,
    refresh,
  };
}
