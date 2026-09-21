"use client";

import { useCallback, useEffect, useState } from "react";

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
  providers: string[];
  keys: ByokKeyMeta[];
}

export function useByok() {
  const [status, setStatus] = useState<ByokStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/byok/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setStatus({ hasKey: !!data.hasKey, providers: data.providers ?? [], keys: data.keys ?? [] });
    } catch {
      // Gate stays closed on network failure — harness will surface BYOK_REQUIRED.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hasKey: status?.hasKey ?? false, providers: status?.providers ?? [], keys: status?.keys ?? [], loading, refresh };
}
