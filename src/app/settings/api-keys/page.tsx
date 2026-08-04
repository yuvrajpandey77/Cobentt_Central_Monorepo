"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Key, Plus, Trash2, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  { id: "openai", label: "OpenAI", placeholder: "sk-..." },
  { id: "anthropic", label: "Anthropic", placeholder: "sk-ant-..." },
  { id: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-..." },
  { id: "google", label: "Google AI", placeholder: "AI..." },
  { id: "deepseek", label: "DeepSeek", placeholder: "sk-..." },
  { id: "mistral", label: "Mistral", placeholder: "" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [keyName, setKeyName] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/api-keys");
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
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

  const handleAddKey = async () => {
    if (!keyValue.trim() || !keyName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: selectedProvider,
          name: keyName,
          apiKey: keyValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add key");
      }

      setKeys((prev) => [data.key, ...prev]);
      setKeyValue("");
      setKeyName("");
      setShowAddForm(false);
      toast.success("API key added successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add key");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id }),
      });

      if (!res.ok) throw new Error("Failed to delete key");

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
          Manage your API keys for AI providers. Keys are encrypted at rest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Bring your own keys to use with Cobentt. Keys are encrypted with AES-256-GCM.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {keys.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Key className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No API keys configured. Add your own keys to use with Cobentt.
              </p>
              <Button className="mt-4" size="sm" onClick={() => setShowAddForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add API Key
              </Button>
            </div>
          )}

          {keys.map((key) => (
            <div key={key.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">{key.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {key.keyPrefix}...{key.keySuffix}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {PROVIDERS.find((p) => p.id === key.provider)?.label || key.provider}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                  </Badge>
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
              <Separator className="mt-4" />
            </div>
          ))}

          {showAddForm && (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <select
                  id="provider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
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
                  placeholder="My OpenAI Key"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Keys are encrypted at rest and never exposed to the client after creation.
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddKey} disabled={saving}>
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
                  }}
                >
                  Cancel
                </Button>
              </div>
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
