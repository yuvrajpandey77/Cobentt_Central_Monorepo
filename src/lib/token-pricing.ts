/**
 * AI Model Pricing Configuration
 * Prices in USD per 1M tokens
 * Updated: October 2024
 */

export const MODEL_PRICING = {
  OPENAI: {
    "gpt-4o": { input: 5.0, output: 15.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4-turbo": { input: 10.0, output: 30.0 },
    "gpt-4": { input: 30.0, output: 60.0 },
    "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
    "gpt-5": { input: 8.0, output: 24.0 }, // Estimated
  },
  ANTHROPIC: {
    "claude-3.5-sonnet": { input: 3.0, output: 15.0 },
    "claude-3-opus": { input: 15.0, output: 75.0 },
    "claude-3-sonnet": { input: 3.0, output: 15.0 },
    "claude-3-haiku": { input: 0.25, output: 1.25 },
    "claude-3.7": { input: 7.5, output: 22.5 }, // Estimated
  },
} as const;

export type AIProvider = keyof typeof MODEL_PRICING;
export type OpenAIModel = keyof typeof MODEL_PRICING.OPENAI;
export type AnthropicModel = keyof typeof MODEL_PRICING.ANTHROPIC;

/**
 * Calculate cost for token usage
 */
export function calculateCost(
  provider: AIProvider,
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  const providerPricing = MODEL_PRICING[provider];
  if (!providerPricing) {
    console.warn(`Unknown provider: ${provider}, using default pricing`);
    return 0;
  }

  const pricing = providerPricing[model as keyof typeof providerPricing] as { input: number; output: number } | undefined;
  
  if (!pricing) {
    console.warn(`Unknown model: ${provider}/${model}, using default pricing`);
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;

  return inputCost + outputCost;
}

/**
 * Plan-based token limits
 */
export const PLAN_LIMITS = {
  FREE: {
    maxDailyTokens: 200_000,
    maxDailyRequests: 6,
    graceTokens: 20_000, // 10% grace
    features: ["basic-support", "community"],
  },
  PRO: {
    maxDailyTokens: 2_000_000,
    maxDailyRequests: 100,
    graceTokens: 200_000, // 10% grace
    features: ["priority-support", "analytics", "webhooks"],
  },
  ENTERPRISE: {
    maxDailyTokens: 10_000_000,
    maxDailyRequests: 1000,
    graceTokens: 1_000_000, // 10% grace
    features: [
      "dedicated-support",
      "custom-limits",
      "sla",
      "webhooks",
      "advanced-analytics",
    ],
  },
  CUSTOM: {
    maxDailyTokens: 0, // Set by admin
    maxDailyRequests: 0, // Set by admin
    graceTokens: 0, // Set by admin
    features: ["all"],
  },
} as const;

export type UserPlan = keyof typeof PLAN_LIMITS;

