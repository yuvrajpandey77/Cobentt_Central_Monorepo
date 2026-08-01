import { getProviderConfig, normalizeModel } from "./provider";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  maxTokens?: number;
}

export async function chatCompletion(
  options: CompletionOptions
): Promise<Response> {
  const cfg = getProviderConfig();
  const model = normalizeModel(options.model || cfg.defaultModel);

  return fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
      ...cfg.extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: options.messages,
      stream: options.stream ?? false,
      max_tokens: options.maxTokens ?? 4096,
    }),
  });
}

export async function nonStreamingCompletion(
  options: CompletionOptions
): Promise<string> {
  const response = await chatCompletion({ ...options, stream: false });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI error (${response.status}): ${errText}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
