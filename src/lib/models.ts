export interface ModelInfo {
  id: string;           // OpenRouter model ID (e.g. "openai/gpt-4o")
  label: string;        // Human-readable name
  provider: string;     // Provider name
  tier: "fast" | "balanced" | "powerful" | "code";
  description: string;
  context: number;      // Context window size
}

export const MODELS: ModelInfo[] = [
  // Fast / Cheap
  {
    id: "openrouter/free",
    label: "OpenRouter Free",
    provider: "OpenRouter",
    tier: "fast",
    description: "Routes to the best available free model",
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

export const DEFAULT_MODEL = "openrouter/free";

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
