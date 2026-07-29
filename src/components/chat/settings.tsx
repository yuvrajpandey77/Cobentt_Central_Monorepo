"use client";

import { useState } from "react";
import { useChat } from "@/lib/chat-store";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Sun,
  Moon,
  Server,
  SlidersHorizontal,
  Shield,
  BookOpen,
  FileText,
  LogOut,
  Trash2,
  Sparkles,
  ChevronRight,
  User,
  Eye,
  EyeOff,
} from "lucide-react";

type SettingsView = "hub" | "appearance" | "advanced" | "privacy";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<SettingsView>("hub");

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-[420px] h-full bg-[var(--color-cb-bg)] border-l border-[var(--color-cb-border)] animate-slide-in-right overflow-y-auto chat-scrollbar">
        {view === "hub" && <SettingsHub onClose={onClose} onNavigate={setView} />}
        {view === "appearance" && <AppearanceSettings onBack={() => setView("hub")} />}
        {view === "advanced" && <AdvancedSettings onBack={() => setView("hub")} />}
        {view === "privacy" && <PrivacySettings onBack={() => setView("hub")} />}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1.5">
      <span className="text-[10px] font-semibold text-[var(--color-cb-text-dim)] uppercase tracking-widest">{title}</span>
    </div>
  );
}

function SettingsRow({ icon: Icon, label, subtitle, onClick, destructive, right }: {
  icon?: any; label: string; subtitle?: string; onClick?: () => void; destructive?: boolean; right?: React.ReactNode;
}) {
  const Row = onClick ? "button" : "div";
  return (
    <Row
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-colors",
        onClick ? "hover:bg-[var(--color-cb-card)] cursor-pointer" : "",
        destructive ? "text-[var(--color-cb-danger)]" : "text-[var(--color-cb-text-muted)]"
      )}
    >
      {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
      <div className="flex-1 text-left">
        <p className={cn("text-[13px]", destructive ? "font-medium" : "font-medium")}>{label}</p>
        {subtitle && <p className="text-[11px] text-[var(--color-cb-text-dim)] mt-0.5">{subtitle}</p>}
      </div>
      {right || (onClick && <ChevronRight className="w-4 h-4 text-[var(--color-cb-text-dim)]" />)}
    </Row>
  );
}

function SettingsHub({ onClose, onNavigate }: { onClose: () => void; onNavigate: (v: SettingsView) => void }) {
  const { user } = useUser();
  return (
    <div>
      <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-cb-border)]">
        <h2 className="text-[15px] font-semibold text-[var(--color-cb-text)]">Settings</h2>
        <button onClick={onClose} className="text-[12px] text-[var(--color-cb-text-muted)] hover:text-[var(--color-cb-text)]">Done</button>
      </div>

      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--color-cb-border)]">
        <div className="w-10 h-10 rounded-full bg-[var(--color-cb-border)] flex items-center justify-center text-sm font-bold text-[var(--color-cb-text-muted)]">
          {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || "?"}
        </div>
        <div>
          <p className="text-[14px] font-medium text-[var(--color-cb-text)]">{user?.fullName || "User"}</p>
          <p className="text-[11px] text-[var(--color-cb-text-dim)]">{user?.emailAddresses?.[0]?.emailAddress || ""}</p>
        </div>
      </div>

      <SectionHeader title="Preferences" />
      <SettingsRow icon={Sun} label="Appearance" subtitle="Theme, text size" onClick={() => onNavigate("appearance")} />
      <SettingsRow icon={Server} label="Advanced" subtitle="AI provider, API keys, model" onClick={() => onNavigate("advanced")} />

      <SectionHeader title="Privacy" />
      <SettingsRow icon={Shield} label="Privacy & Data" subtitle="Data controls, legal" onClick={() => onNavigate("privacy")} />
      <SettingsRow icon={BookOpen} label="Terms of Service" />
      <SettingsRow icon={FileText} label="Privacy Policy" />
    </div>
  );
}

function AppearanceSettings({ onBack }: { onBack: () => void }) {
  const { sidebarCollapsed, setSidebarCollapsed } = useChat();

  return (
    <div>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-cb-border)]">
        <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-muted)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--color-cb-text)]">Appearance</h2>
      </div>

      <SectionHeader title="Theme" />
      <div className="px-4 py-2 flex gap-3">
        <button className="flex-1 flex flex-col items-center gap-2 p-4 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[12px] border-2 border-[var(--color-cb-accent)] bg-[var(--color-cb-card)]">
          <Moon className="w-5 h-5 text-[var(--color-cb-text)]" />
          <span className="text-[11px] font-medium text-[var(--color-cb-text)]">Dark</span>
        </button>
      </div>

      <SectionHeader title="Sidebar" />
      <div className="px-4 py-1">
        <label className="flex items-center justify-between py-2">
          <span className="text-[13px] text-[var(--color-cb-text-muted)]">Collapse sidebar by default</span>
          <input
            type="checkbox"
            checked={sidebarCollapsed}
            onChange={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-4 h-4 accent-white"
          />
        </label>
      </div>
    </div>
  );
}

const PROVIDERS = [
  { id: "openrouter", label: "OpenRouter", desc: "Access 200+ models" },
  { id: "openai", label: "OpenAI", desc: "GPT-4, GPT-3.5" },
  { id: "anthropic", label: "Anthropic", desc: "Claude 3.5 Sonnet/Haiku" },
  { id: "google", label: "Google AI", desc: "Gemini Pro, Gemini Flash" },
  { id: "custom", label: "Custom Endpoint", desc: "Any OpenAI-compatible API" },
] as const;

function AdvancedSettings({ onBack }: { onBack: () => void }) {
  const {
    provider, setProvider, apiKey, setApiKey, baseUrl, setBaseUrl,
    modelId, setModelId, temperature, setTemperature,
    topP, setTopP, contentFilter, setContentFilter,
    webSearchEngine, setWebSearchEngine, searxngUrl, setSearxngUrl,
    customInstructions, setCustomInstructions, saveSettings,
  } = useChat();
  const [showKey, setShowKey] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-cb-border)]">
        <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-muted)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--color-cb-text)]">Advanced</h2>
      </div>

      <SectionHeader title="AI Provider" />
      <div className="px-4 py-1 space-y-1">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id as any)}
            className={cn(
              "w-full text-left px-3 py-2.5 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] transition-colors",
              provider === p.id ? "bg-[var(--color-cb-input-focus)] border border-[var(--color-cb-border-strong)]" : "hover:bg-[var(--color-cb-card)]"
            )}
          >
            <p className="text-[13px] font-medium text-[var(--color-cb-text)]">{p.label}</p>
            <p className="text-[11px] text-[var(--color-cb-text-dim)]">{p.desc}</p>
          </button>
        ))}
      </div>

      <SectionHeader title="API Key" />
      <div className="px-4 py-1">
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onBlur={saveSettings}
            placeholder="sk-..."
            className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 pr-10 text-[13px] text-[var(--color-cb-text)] placeholder:text-[var(--color-cb-text-dim)] outline-none focus:border-[var(--color-cb-border-strong)]"
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-cb-text-dim)] hover:text-[var(--color-cb-text-muted)]">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {provider === "custom" && (
          <>
            <SectionHeader title="Base URL" />
            <input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              onBlur={saveSettings}
              placeholder="https://..."
              className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 text-[13px] text-[var(--color-cb-text)] placeholder:text-[var(--color-cb-text-dim)] outline-none focus:border-[var(--color-cb-border-strong)]"
            />
          </>
        )}
      </div>

      <SectionHeader title="Model" />
      <div className="px-4 py-1">
        <input
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          onBlur={saveSettings}
          placeholder={provider === "openrouter" ? "cohere/north-mini-code:free" : "gpt-4o-mini"}
          className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 text-[13px] text-[var(--color-cb-text)] placeholder:text-[var(--color-cb-text-dim)] outline-none focus:border-[var(--color-cb-border-strong)]"
        />
      </div>

      <SectionHeader title="Parameters" />
      <div className="px-4 py-1 space-y-4">
        <div>
          <label className="flex justify-between text-[12px] text-[var(--color-cb-text-muted)]">
            <span>Temperature</span>
            <span>{temperature.toFixed(1)}</span>
          </label>
          <input
            type="range" min="0" max="2" step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            onMouseUp={saveSettings}
            className="w-full accent-white"
          />
        </div>
        <div>
          <label className="flex justify-between text-[12px] text-[var(--color-cb-text-muted)]">
            <span>Top P</span>
            <span>{topP.toFixed(1)}</span>
          </label>
          <input
            type="range" min="0" max="1" step="0.05"
            value={topP}
            onChange={(e) => setTopP(parseFloat(e.target.value))}
            onMouseUp={saveSettings}
            className="w-full accent-white"
          />
        </div>
      </div>

      <SectionHeader title="Content Filter" />
      <div className="px-4 py-1">
        <select
          value={contentFilter}
          onChange={(e) => setContentFilter(e.target.value as any)}
          className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 text-[13px] text-[var(--color-cb-text)] outline-none"
        >
          <option value="off">Off</option>
          <option value="standard">Standard</option>
          <option value="strict">Strict</option>
        </select>
      </div>

      <SectionHeader title="Web Search Engine" />
      <div className="px-4 py-1">
        <select
          value={webSearchEngine}
          onChange={(e) => setWebSearchEngine(e.target.value as any)}
          className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 text-[13px] text-[var(--color-cb-text)] outline-none"
        >
          <option value="duckduckgo">DuckDuckGo</option>
          <option value="searxng">SearXNG</option>
        </select>
        {webSearchEngine === "searxng" && (
          <input
            value={searxngUrl}
            onChange={(e) => setSearxngUrl(e.target.value)}
            onBlur={saveSettings}
            placeholder="http://localhost:8888"
            className="w-full mt-2 bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2 text-[13px] text-[var(--color-cb-text)] placeholder:text-[var(--color-cb-text-dim)] outline-none"
          />
        )}
      </div>

      <SectionHeader title="Custom Instructions" />
      <div className="px-4 py-1">
        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          onBlur={saveSettings}
          placeholder="Tell Cobentt about yourself, your preferences, or how you'd like to be helped..."
          rows={3}
          className="w-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 text-[13px] text-[var(--color-cb-text)] placeholder:text-[var(--color-cb-text-dim)] outline-none resize-none"
        />
      </div>

      <div className="h-8" />
    </div>
  );
}

function PrivacySettings({ onBack }: { onBack: () => void }) {
  const { deleteAllData } = useChat();

  return (
    <div>
      <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--color-cb-border)]">
        <button onClick={onBack} className="w-7 h-7 flex items-center justify-center rounded hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-muted)]">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-[15px] font-semibold text-[var(--color-cb-text)]">Privacy & Data</h2>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div>
          <p className="text-[13px] text-[var(--color-cb-text)] font-medium">Data Storage</p>
          <p className="text-[12px] text-[var(--color-cb-text-dim)] mt-1 leading-relaxed">
            Your conversations are stored securely on our servers. Messages are encrypted in transit and at rest.
            Your API keys are stored locally in your browser and are never sent to our servers.
          </p>
        </div>

        <div>
          <p className="text-[13px] text-[var(--color-cb-text)] font-medium">Training</p>
          <p className="text-[12px] text-[var(--color-cb-text-dim)] mt-1 leading-relaxed">
            Your conversations are never used to train AI models. We believe your data is yours.
          </p>
        </div>

        <div>
          <p className="text-[13px] text-[var(--color-cb-text)] font-medium">Delete All Data</p>
          <p className="text-[12px] text-[var(--color-cb-text-dim)] mt-1 leading-relaxed">
            This will permanently delete all your conversations and local settings. This action cannot be undone.
          </p>
          <button
            onClick={deleteAllData}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] bg-[var(--color-cb-danger)]/10 border border-[var(--color-cb-danger)]/30 text-[12px] text-[var(--color-cb-danger)] hover:bg-[var(--color-cb-danger)]/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Delete All Conversations
          </button>
        </div>
      </div>
    </div>
  );
}
