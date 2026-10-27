"use client";

import { useState } from "react";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useByok } from "@/hooks/use-byok";
import { fetchJson } from "@/lib/safe-fetch-json";

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter (recommended)", placeholder: "sk-or-v1-..." },
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
];

/**
 * BYOK gate — asks for the user's own key FIRST, before the harness runs.
 * Wrap any AI surface: when no key is saved, the harness is blocked behind
 * this modal. Keys are never displayed back; only prefix…suffix metadata.
 */
export function ByokGate({ children }: { children: React.ReactNode }) {
  const { hasKey, canUseServerKey, loading, refresh } = useByok();
  const [dismissed, setDismissed] = useState(false);

  // Paid users may use the managed Cobentt credential. The server repeats this
  // authorization before every AI request, so this only controls presentation.
  if (loading || hasKey || canUseServerKey || dismissed) return <>{children}</>;

  return (
    <>
      <div className="pointer-events-none select-none blur-[1px] opacity-60 grayscale-[0.2]">
        {children}
      </div>
      <ByokModal
        onDone={() => {
          refresh();
          setDismissed(true);
        }}
      />
    </>
  );
}

export function ByokModal({ onDone }: { onDone?: () => void }) {
  const [provider, setProvider] = useState("openrouter");
  const [name, setName] = useState("My key");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMsg, setTestMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const handleTest = async () => {
    if (!apiKey.trim()) {
      toast.error("Paste your API key first");
      return;
    }
    setTesting(true);
    setTestResult(null);
    setTestMsg("");
    try {
      const { data } = await fetchJson<{ ok: boolean; error?: string }>(`/api/byok/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Test with a cheap model so checking a key never runs the paid Fusion synthesizer.
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          model: provider === "openai" ? "openai/gpt-4o-mini" : "openrouter/free",
        }),
      });
      if (data?.ok) {
        setTestResult("ok");
        setTestMsg("Connected — your key works.");
      } else {
        setTestResult("fail");
        setTestMsg(data?.error || "Test failed. Check your connection and retry.");
      }
    } catch {
      setTestResult("fail");
      setTestMsg("Test failed. Check your connection and retry.");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim() || !name.trim()) {
      toast.error("Add a name and paste your key");
      return;
    }
    if (testResult !== "ok") {
      toast.error("Test the key first — only working keys are saved");
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await fetchJson<{ error?: string }>(`/api/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, name: name.trim(), apiKey: apiKey.trim() }),
      });
      if (!ok) throw new Error(data?.error || "Failed to save key");
      // Key material leaves memory immediately.
      setApiKey("");
      toast.success("Key saved — AI is ready");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save key");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1d20] p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a3c987]/15 text-[#a3c987]">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Bring your own key</h2>
            <p className="text-xs text-text-tertiary">
              Cobentt runs on your API key. Add one to unlock chat &amp; builders.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">Provider</Label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value);
                setTestResult(null);
              }}
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-[#a3c987]/60"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#1a1d20]">
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-tertiary">
              Pick the provider whose key you have. The chat model menu then offers its two models.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">Key name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My OpenRouter key"
              className="border-white/10 bg-black/40 text-white placeholder:text-text-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-text-secondary">API key</Label>
            <div className="flex gap-2">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder={PROVIDERS.find((p) => p.id === provider)?.placeholder}
                className="border-white/10 bg-black/40 font-mono text-white placeholder:text-text-muted"
                autoComplete="off"
                spellCheck={false}
              />
              <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)} className="border-white/10">
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[11px] text-text-tertiary">
              Encrypted with AES-256-GCM. Never shown again after saving.
            </p>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                testResult === "ok"
                  ? "border-[#a3c987]/30 bg-[#a3c987]/10 text-[#a3c987]"
                  : "border-red-400/30 bg-red-400/10 text-red-300"
              }`}
            >
              {testResult === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>{testMsg}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              onClick={handleTest}
              disabled={testing || !apiKey.trim()}
              variant="outline"
              className="flex-1 border-white/15"
            >
              {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <FlaskConical className="mr-2 h-4 w-4" />
              Test
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || testResult !== "ok"}
              className="flex-1 bg-[#a3c987] text-black hover:bg-[#a3c987]/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save & continue
            </Button>
          </div>
          <p className="text-center text-[11px] text-text-muted">
            Test first — only working keys can be saved. Manage keys anytime in Settings → API Keys.
          </p>
        </div>
      </div>
    </div>
  );
}
