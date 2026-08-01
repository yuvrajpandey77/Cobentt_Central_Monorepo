export interface UsageRecord {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  context: Record<string, unknown>;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function parseUsage(data: unknown): { input: number; output: number } {
  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number } })?.usage;
  return {
    input: usage?.prompt_tokens ?? 0,
    output: usage?.completion_tokens ?? 0,
  };
}
