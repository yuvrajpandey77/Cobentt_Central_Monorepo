export type AIProvider = "openrouter" | "openai" | "custom";

export interface ProviderConfig {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  extraHeaders: Record<string, string>;
}

function resolveApiKey(): string {
  return (
    process.env.AI_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    ""
  );
}

function resolveProvider(): AIProvider {
  const explicit = process.env.AI_PROVIDER;
  if (explicit === "openai") return "openai";
  if (explicit === "custom") return "custom";
  if (explicit === "openrouter") return "openrouter";
  return process.env.OPENROUTER_API_KEY ? "openrouter" : "openai";
}

function resolveDefaultModel(): string {
  return process.env.AI_MODEL || "openai/gpt-4o-mini";
}

export function getProviderConfig(): ProviderConfig {
  const provider = resolveProvider();
  const apiKey = resolveApiKey();

  if (provider === "openai") {
    return {
      provider,
      baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      apiKey,
      defaultModel: resolveDefaultModel(),
      extraHeaders: {},
    };
  }

  if (provider === "custom") {
    return {
      provider,
      baseUrl: process.env.AI_BASE_URL || "https://api.openai.com/v1",
      apiKey,
      defaultModel: resolveDefaultModel(),
      extraHeaders: {},
    };
  }

  return {
    provider: "openrouter",
    baseUrl: process.env.AI_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey,
    defaultModel: resolveDefaultModel(),
    extraHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://cobentt.com",
      "X-Title": "Cobentt",
    },
  };
}

export function normalizeModel(model: string): string {
  const cfg = getProviderConfig();
  // OpenRouter ids such as "openrouter/fusion" are valid as sent.
  if (cfg.provider === "openrouter") {
    return model;
  }
  if (cfg.provider === "openai") {
    return model.replace(/^openrouter\//, "").replace(/^openai\//, "");
  }
  return model;
}
