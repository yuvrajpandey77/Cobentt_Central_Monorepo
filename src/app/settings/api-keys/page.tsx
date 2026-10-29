"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Key, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertCircle,
  Loader2, FlaskConical, RefreshCw, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { DEFAULT_MODEL, UNIQUE_MODELS } from "@/lib/models";
import { fetchJson } from "@/lib/safe-fetch-json";

interface ApiKeyEntry {
  id: string;
  provider: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter (recommended — works with all models)", placeholder: "sk-or-v1-..." },
  { id: "openai", label: "OpenAI (GPT models only)", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic (stored; routed via OpenRouter)", placeholder: "sk-ant-..." },
  { id: "google", label: "Google AI (stored; routed via OpenRouter)", placeholder: "AI..." },
  { id: "deepseek", label: "DeepSeek (stored; routed via OpenRouter)", placeholder: "sk-..." },
  { id: "mistral", label: "Mistral (stored; routed via OpenRouter)", placeholder: "" },
];

type TestState = { state: "idle" } | { state: "testing" } | { state: "ok"; msg: string } | { state: "fail"; msg: string };

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openrouter");
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Test + rotate state
  const [testModel, setTestModel] = useState(DEFAULT_MODEL);
  const [tests, setTests] = useState<Record<string, TestState>>({});
  const [preSaveTest, setPreSaveTest] = useState<TestState>({ state: "idle" });
  const [preSaveTesting, setPreSaveTesting] = useState(false);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [rotateValue, setRotateValue] = useState("");
  const [rotating, setRotating] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const { ok, data } = await fetchJson<{ keys: ApiKeyEntry[] }>("/api/settings/api-keys");
      if (!ok || !data) throw new Error("Failed to fetch keys");
      setKeys(data.keys);
    } catch {
      toast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const testSavedKey = async (id: string) => {
    setTests((p) => ({ ...p, [id]: { state: "testing" } }));
    try {
      const { data } = await fetchJson<{ ok: boolean; error?: string }>(`/api/byok/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id, model: testModel }),
      });
      setTests((p) => ({
        ...p,
        [id]: data?.ok
          ? { state: "ok", msg: `Works with ${testModel}` }
          : { state: "fail", msg: data?.error || "Test failed. Check your connection and retry." },
      }));
    } catch {
      setTests((p) => ({ ...p, [id]: { state: "fail", msg: "Test failed. Check your connection and retry." } }));
    }
  };

  const testUnsavedKey = async () => {
    if (!keyValue.trim()) {
      toast.error("Paste your key first");
      return;
    }
    setPreSaveTesting(true);
    setPreSaveTest({ state: "testing" });
    try {
      const { data } = await fetchJson<{ ok: boolean; error?: string }>(`/api/byok/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selectedProvider, apiKey: keyValue.trim(), model: testModel }),
      });
      setPreSaveTest(
        data?.ok
          ? { state: "ok", msg: `Connected — ${testModel} responded.` }
          : { state: "fail", msg: data?.error || "Test failed. Check your connection and retry." }
      );
    } catch {
      setPreSaveTest({ state: "fail", msg: "Test failed. Check your connection and retry." });
    } finally {
      setPreSaveTesting(false);
    }
  };

  const handleAddKey = async () => {
    if (!keyValue.trim() || !keyName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (preSaveTest.state !== "ok") {
      toast.error("Test the key first — only working keys are saved");
      return;
    }
    setSaving(true);
    try {
      const { ok, data } = await fetchJson<{ key: ApiKeyEntry; error?: string }>(`/api/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          name: keyName,
          apiKey: keyValue.trim(),
        }),
      });
      if (!ok || !data?.key) throw new Error(data?.error || "Failed to add key");
      setKeys((prev) => [data.key, ...prev]);
      setKeyValue("");
      setKeyName("");
      setShowAddForm(false);
      setPreSaveTest({ state: "idle" });
      toast.success("API key added successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add key");
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (id: string) => {
    if (!rotateValue.trim()) {
      toast.error("Paste the new key value");
      return;
    }
    setRotating(true);
    try {
      const { ok, data } = await fetchJson<{ key: ApiKeyEntry; error?: string }>(`/api/settings/api-keys/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id, apiKey: rotateValue.trim() }),
      });
      if (!ok || !data?.key) throw new Error(data?.error || "Failed to update key");
      setKeys((prev) => prev.map((k) => (k.id === id ? data.key : k)));
      setRotatingId(null);
      setRotateValue("");
      setTests((p) => ({ ...p, [id]: { state: "idle" } }));
      toast.success("Key updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update key");
    } finally {
      setRotating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setDeletingId(id);
    try {
      const { ok, error } = await fetchJson(`/api/settings/api-keys/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id }),
      });
      if (!ok) throw new Error(error || "Failed to delete key");
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success("API key removed");
    } catch {
      toast.error("Failed to remove key");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Bring your own key to unlock chat &amp; builders. Keys are encrypted with AES-256-GCM and never shown again.
        </p>
      </div>

      {/* Test model picker — applies to every Test button below */}
      <Card className="border-white/10 bg-white/[0.03]">
        <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Test model</p>
            <p className="text-xs text-muted-foreground">
              Pick the model each Test button tries. OpenRouter keys work with all models; OpenAI keys with GPT models.
            </p>
          </div>
          <select
            value={testModel}
            onChange={(e) => setTestModel(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-[var(--color-cb-text)] outline-none focus:border-[var(--color-cb-accent)]/60 sm:w-72"
          >
            {UNIQUE_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="bg-[var(--color-cb-bg-elevated)]">
                {m.label} — {m.provider}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Test a key against {testModel}, then save. Update rotates the secret in place.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-dashed border-white/15 p-8 text-center">
              <Key className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No API keys yet. Add your OpenRouter or OpenAI key to start using AI.
              </p>
              <Button className="mt-4" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add API Key
              </Button>
            </div>
          )}

          {keys.map((key) => {
            const t = tests[key.id] ?? { state: "idle" as const };
            const isRotating = rotatingId === key.id;
            return (
              <div key={key.id}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {key.keyPrefix}...{key.keySuffix}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {PROVIDERS.find((p) => p.id === key.provider)?.label || key.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" suppressHydrationWarning>
                      {key.lastUsedAt
                        ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString("en-US")}`
                        : "Never used"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => testSavedKey(key.id)}
                      disabled={t.state === "testing"}
                    >
                      {t.state === "testing" ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FlaskConical className="mr-1 h-3.5 w-3.5" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRotatingId(isRotating ? null : key.id);
                        setRotateValue("");
                      }}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                      Update
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(key.id)}
                      disabled={deletingId === key.id}
                    >
                      {deletingId === key.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </Button>
                  </div>
                </div>

                {t.state === "ok" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-green-500">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t.msg}
                  </p>
                )}
                {t.state === "fail" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-destructive">
                    <XCircle className="h-3.5 w-3.5" /> {t.msg}
                  </p>
                )}
                {t.state === "testing" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Testing against {testModel}…
                  </p>
                )}

                {isRotating && (
                  <div className="mt-3 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/30 p-3 sm:flex-row">
                    <Input
                      type="password"
                      value={rotateValue}
                      onChange={(e) => setRotateValue(e.target.value)}
                      placeholder="Paste new key value"
                      className="font-mono"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRotate(key.id)} disabled={rotating || !rotateValue.trim()}>
                        {rotating && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                        Save new key
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setRotatingId(null); setRotateValue(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                <Separator className="mt-4" />
              </div>
            );
          })}

          {showAddForm && (
            <div className="space-y-4 rounded-lg border border-white/10 bg-black/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  value={selectedProvider}
                  onChange={(e) => { setSelectedProvider(e.target.value); setPreSaveTest({ state: "idle" }); }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="My OpenRouter Key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={keyValue}
                    onChange={(e) => { setKeyValue(e.target.value); setPreSaveTest({ state: "idle" }); }}
                    placeholder={PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder}
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  Keys are encrypted at rest and never exposed after creation.
                </p>
              </div>

              {preSaveTest.state === "ok" && (
                <p className="flex items-center gap-1.5 text-xs text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {preSaveTest.msg}
                </p>
              )}
              {preSaveTest.state === "fail" && (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> {preSaveTest.msg}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={testUnsavedKey} disabled={preSaveTesting || !keyValue.trim()}>
                  {preSaveTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-2 h-4 w-4" />}
                  Test ({testModel})
                </Button>
                <Button size="sm" onClick={handleAddKey} disabled={saving || preSaveTest.state !== "ok"}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Key
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setKeyValue("");
                    setKeyName("");
                    setPreSaveTest({ state: "idle" });
                  }}
                >
                  Cancel
                </Button>
              </div>
              {preSaveTest.state !== "ok" && (
                <p className="text-xs text-muted-foreground">Test first — only working keys can be saved.</p>
              )}
            </div>
          )}

          {!showAddForm && keys.length > 0 && (
            <Button size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Another Key
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
