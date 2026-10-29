export interface ModelInfo {
  id: string;           // OpenRouter model ID (e.g. "openai/gpt-4o")
  label: string;        // Human-readable name
  provider: string;     // Provider name
  tier: "fast" | "balanced" | "powerful" | "code";
  description: string;
  context: number;      // Context window size
}

export const MODELS: ModelInfo[] = [
  // OpenRouter: default. Fuses a panel of models into one answer.
  {
    id: "openrouter/fusion",
    label: "OpenRouter Fusion",
    provider: "OpenRouter",
    tier: "powerful",
    description: "Several models answer, then one fused answer",
    context: 131072,
  },
  {
    id: "openrouter/auto",
    label: "OpenRouter Auto",
    provider: "OpenRouter",
    tier: "balanced",
    description: "Picks an available model for each request",
    context: 131072,
  },
  // Fast / Cheap
  {
    id: "openrouter/free",
    label: "OpenRouter Free (auto fallback)",
    provider: "OpenRouter",
    tier: "fast",
    description: "Free models; falls back to Auto when a free model returns nothing",
    context: 131072,
  },
  {
    id: "openai/gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    tier: "fast",
    description: "Fast and affordable for everyday tasks",
    context: 128000,
  },
  {
    id: "anthropic/claude-3-haiku",
    label: "Claude 3 Haiku",
    provider: "Anthropic",
    tier: "fast",
    description: "Quick responses for simple queries",
    context: 200000,
  },
  {
    id: "google/gemini-2.0-flash-001",
    label: "Gemini 2.0 Flash",
    provider: "Google",
    tier: "fast",
    description: "Fast, efficient, and multimodal",
    context: 1000000,
  },

  // Balanced
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    tier: "balanced",
    description: "Best overall balance of speed and quality",
    context: 128000,
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    tier: "balanced",
    description: "Excellent reasoning and coding ability",
    context: 200000,
  },
  {
    id: "google/gemini-2.0-pro-001",
    label: "Gemini 2.0 Pro",
    provider: "Google",
    tier: "balanced",
    description: "Strong reasoning with long context",
    context: 1000000,
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
    provider: "DeepSeek",
    tier: "balanced",
    description: "Open-weight model with strong performance",
    context: 64000,
  },

  // Powerful
  {
    id: "openai/gpt-4.5-preview",
    label: "GPT-4.5 Preview",
    provider: "OpenAI",
    tier: "powerful",
    description: "OpenAI's most capable model",
    context: 128000,
  },
  {
    id: "anthropic/claude-3-opus",
    label: "Claude 3 Opus",
    provider: "Anthropic",
    tier: "powerful",
    description: "Anthropic's most powerful for complex tasks",
    context: 200000,
  },
  {
    id: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "DeepSeek",
    tier: "powerful",
    description: "Advanced reasoning with chain-of-thought",
    context: 128000,
  },

  // Code-specialized
  {
    id: "anthropic/claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    tier: "code",
    description: "Top-tier coding and technical tasks",
    context: 200000,
  },
  {
    id: "openai/gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
    tier: "code",
    description: "Excellent for code generation and debugging",
    context: 128000,
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    label: "Qwen 2.5 Coder 32B",
    provider: "Qwen",
    tier: "code",
    description: "Specialized code model, open-weight",
    context: 32768,
  },
];

/** Models offered for each key provider, in order. The first is the default. */
export const PROVIDER_MODEL_OPTIONS: Record<string, string[]> = {
  openrouter: ["openrouter/fusion", "openrouter/auto", "openrouter/free"],
  openai: ["openai/gpt-4o-mini", "openai/gpt-4o"],
};

/** Provider order when a user has keys for more than one. OpenRouter wins. */
const PROVIDER_PRIORITY = ["openrouter", "openai"];

export const DEFAULT_MODEL = "openrouter/fusion";

/** The provider whose models the picker should offer, from the keys the user saved. */
export function activeProvider(providers: string[]): string | null {
  return PROVIDER_PRIORITY.find((p) => providers.includes(p)) ?? null;
}

/** Models to show for the user's keys. With no keys, the full list is shown. */
export function modelOptionsFor(providers: string[]): ModelInfo[] {
  const provider = activeProvider(providers);
  if (!provider) return UNIQUE_MODELS;
  return PROVIDER_MODEL_OPTIONS[provider]
    .map((id) => getModelById(id))
    .filter((m): m is ModelInfo => Boolean(m));
}

/** Default model for the user's keys: OpenRouter Fusion, or the OpenAI default. */
export function defaultModelFor(providers: string[]): string {
  const provider = activeProvider(providers);
  return provider ? PROVIDER_MODEL_OPTIONS[provider][0] : DEFAULT_MODEL;
}

export type ModeKey = "slides" | "document" | "sheet" | "deep-research";

export const MODE_DEFAULTS: Record<ModeKey, string> = {
  slides: "openai/gpt-4o-mini",
  document: "openai/gpt-4o-mini",
  sheet: "openai/gpt-4o",
  "deep-research": "openai/gpt-4o",
};

export const TIER_LABELS: Record<string, string> = {
  fast: "Fast & Cheap",
  balanced: "Balanced",
  powerful: "Most Capable",
  code: "Code Specialized",
};

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id);
}

/** MODELS contains the same id under multiple tiers — deduped list for flat dropdowns (unique React keys). */
export const UNIQUE_MODELS: ModelInfo[] = [...new Map(MODELS.map((m) => [m.id, m])).values()];

export function getModelsByTier(tier: string): ModelInfo[] {
  return MODELS.filter((m) => m.tier === tier);
}
