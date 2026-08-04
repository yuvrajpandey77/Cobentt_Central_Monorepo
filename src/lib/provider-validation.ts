export interface ProviderValidation {
  provider: string;
  label: string;
  pattern: RegExp;
  placeholder: string;
}

export const PROVIDERS: ProviderValidation[] = [
  {
    provider: "openai",
    label: "OpenAI",
    pattern: /^sk-[A-Za-z0-9_-]{20,}$/,
    placeholder: "sk-...",
  },
  {
    provider: "anthropic",
    label: "Anthropic",
    pattern: /^sk-ant-[A-Za-z0-9_-]{20,}$/,
    placeholder: "sk-ant-...",
  },
  {
    provider: "openrouter",
    label: "OpenRouter",
    pattern: /^sk-or-v1-[A-Za-z0-9_-]{20,}$/,
    placeholder: "sk-or-v1-...",
  },
  {
    provider: "google",
    label: "Google AI",
    pattern: /^AI[A-Za-z0-9_-]{20,}$/,
    placeholder: "AI...",
  },
  {
    provider: "deepseek",
    label: "DeepSeek",
    pattern: /^sk-[A-Za-z0-9_-]{20,}$/,
    placeholder: "sk-...",
  },
  {
    provider: "mistral",
    label: "Mistral",
    pattern: /^[A-Za-z0-9_-]{20,}$/,
    placeholder: "",
  },
];

export function validateProviderKey(
  provider: string,
  key: string
): { valid: boolean; error?: string } {
  const p = PROVIDERS.find((pr) => pr.provider === provider);
  if (!p) {
    return { valid: false, error: `Unknown provider: ${provider}` };
  }
  if (!p.pattern.test(key)) {
    return {
      valid: false,
      error: `Invalid key format for ${p.label}. Expected: ${p.placeholder}`,
    };
  }
  return { valid: true };
}
