import { openai } from "@inngest/agent-kit";
import { getProviderConfig, normalizeModel } from "./provider";

export function agentModel(model?: string) {
  const cfg = getProviderConfig();
  return openai({
    model: normalizeModel(model || cfg.defaultModel),
    apiKey: cfg.apiKey,
    baseUrl: cfg.baseUrl.endsWith("/")
      ? cfg.baseUrl
      : `${cfg.baseUrl}/`,
  });
}
