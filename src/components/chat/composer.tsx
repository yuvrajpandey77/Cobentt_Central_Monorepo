"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, type Message } from "@/lib/chat-store";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import TextareaAutosize from "react-textarea-autosize";
import { Plus, Globe, Send, Square } from "lucide-react";
import { toast } from "sonner";

const starters = [
  "Write a Python script to parse CSV files",
  "Explain quantum computing simply",
  "Draft a professional email",
  "Compare React and Vue",
];

export function Composer({
  onStreamMessage,
  onUserMessage,
  initialPrompt,
  regenerateRequest,
  onRegenerateHandled,
}: {
  onStreamMessage?: (msg: Message | null) => void;
  onUserMessage?: (msg: Message) => void;
  initialPrompt?: string;
  regenerateRequest?: { userMessageId: string; content: string } | null;
  onRegenerateHandled?: () => void;
}) {
  const {
    activeThread, createThread, isStreaming, setIsStreaming,
    provider, apiKey, baseUrl, modelId, temperature, topP,
    webSearch, setWebSearch, pendingEditContent, clearPendingEdit,
    refetchConversations, selectThread,
  } = useChat();

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [value, setValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const createConvMutation = useMutation(trpc.conversations.create.mutationOptions());
  const createMessageMutation = useMutation(trpc.chatMessages.create.mutationOptions());
  const regenerateMutation = useMutation(trpc.chatMessages.regenerate.mutationOptions({
    onError: (err) => toast.error(err.message || "Failed to regenerate"),
  }));

  useEffect(() => {
    if (!regenerateRequest || !activeThread) return;
    const { userMessageId, content } = regenerateRequest;
    onRegenerateHandled?.();
    const run = async () => {
      try {
        await regenerateMutation.mutateAsync({ conversationId: activeThread.id, userMessageId });
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: activeThread.id }));
        await handleStream(activeThread.id, content);
      } catch {
        // error toast handled by mutation
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regenerateRequest, activeThread]);

  useEffect(() => {
    setIsStreaming(false);
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [setIsStreaming]);

  useEffect(() => {
    if (pendingEditContent !== null) {
      setValue(pendingEditContent);
      clearPendingEdit();
      textareaRef.current?.focus();
    }
  }, [pendingEditContent, clearPendingEdit]);

  const initialSentRef = useRef(false);
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && !initialSentRef.current && !isStreaming) {
      initialSentRef.current = true;
      handleSend(initialPrompt.trim());
    }
  }, [initialPrompt, isStreaming]);

  const handleStream = async (conversationId: string, userContent: string) => {
    setIsStreaming(true);

    const assistantId = `stream-${Date.now()}`;
    const placeholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };
    onStreamMessage?.(placeholder);

    const webSources = webSearch ? [{ index: 1, title: "Web Search" }] : undefined;

    try {
      const res = await fetch(`/api/chat/${conversationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userContent,
          model: modelId || undefined,
          sources: webSources,
        }),
        signal: abortRef.current?.signal,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`API error (${res.status}): ${errText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let fullThinking = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);

            // First event: messageId
            if (parsed.messageId) continue;

            // Token event
            if (parsed.token) {
              fullContent += parsed.token;
              onStreamMessage?.({
                id: assistantId,
                role: "assistant",
                content: fullContent,
                timestamp: Date.now(),
              });
            }

            // Thinking event
            if (parsed.thinking) {
              fullThinking += parsed.thinking;
              onStreamMessage?.({
                id: assistantId,
                role: "assistant",
                content: fullContent,
                timestamp: Date.now(),
                thinking: fullThinking,
              });
            }

            // Done event: persist completed exchange into getById cache so the
            // message list never flashes empty while the refetch is in flight.
            if (parsed.done) {
              const queryKey = trpc.conversations.getById.queryOptions({ id: conversationId }).queryKey;
              const existing = queryClient.getQueryData(queryKey) as
                | { id: string; messages?: Array<{ id: string; role: string; content: string }>; title?: string | null }
                | undefined;
              const existingMessages = existing?.messages ?? [];
              const userAlreadyInCache = existingMessages.some(
                (m) => m.role.toLowerCase() === "user" && m.content === userContent
              );
              const now = new Date().toISOString();
              const merged = [
                ...existingMessages.filter((m) => m.id !== assistantId),
                ...(userAlreadyInCache
                  ? []
                  : [{ id: `user-${Date.now()}`, content: userContent, role: "USER", type: "RESULT", status: "COMPLETE", createdAt: now }]),
                {
                  id: assistantId,
                  content: fullContent,
                  role: "ASSISTANT",
                  type: "RESULT",
                  status: "COMPLETE",
                  createdAt: now,
                  thinking: fullThinking || undefined,
                  sources: webSources && webSources.length > 0 ? webSources : undefined,
                  modelUsed: parsed.model || undefined,
                },
              ];
              queryClient.setQueryData(queryKey, {
                ...(existing ?? {}),
                id: conversationId,
                messages: merged,
              } as never);
              onStreamMessage?.(null);
            }

            // Error event
            if (parsed.error) {
              throw new Error(parsed.error);
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }

      // Invalidate cache to reload persisted messages
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
    } catch (err: unknown) {
      abortRef.current = null;
      const msg = err instanceof Error ? err.message : "Request failed";
      onStreamMessage?.({
        id: assistantId,
        role: "assistant",
        content: `**Error:** ${msg}\n\nMake sure the server is running and try again.`,
        timestamp: Date.now(),
      });
      // Let user see error, clear after timeout
      setTimeout(() => onStreamMessage?.(null), 5000);
    }

    setIsStreaming(false);
  };

  const handleSend = async (overrideText?: string) => {
    const trimmed = (overrideText ?? value).trim();
    if (!trimmed || isStreaming) return;

    if (!overrideText) {
      setValue("");
      setShowMenu(false);
    }

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    onUserMessage?.(userMsg);

    const threadId = activeThread?.id;

    if (!threadId) {
      try {
        const result = await createConvMutation.mutateAsync({ initialMessage: trimmed });
        selectThread(result.id);
        await handleStream(result.id, trimmed);
      } catch {
        toast.error("Failed to create conversation");
      }
    } else {
      try {
        await createMessageMutation.mutateAsync({
          conversationId: threadId,
          content: trimmed,
        });
      } catch {
        // Persist failed; still stream so the user gets a reply
      }
      await handleStream(threadId, trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-[810px] mx-auto">
      {/* Starter pills */}
      {!isStreaming && !value && (activeThread?.messages.length || 0) === 0 && (
        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
          {starters.map((s) => (
            <button
              key={s}
              onClick={() => { setValue(s); textareaRef.current?.focus(); }}
              className="px-3 py-1.5 rounded-full bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] text-[12px] text-[var(--color-cb-text-muted)] hover:border-[var(--color-cb-border-strong)] hover:text-[var(--color-cb-text)] transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer bar */}
      <div className="relative border border-white/20 rounded-3xl bg-white/10 backdrop-blur-lg shadow-xl transition-all duration-200 ease-out cursor-text">
        <div className="flex items-center gap-1.5 px-3 py-2">
          {/* Left menu trigger */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white/60 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute bottom-11 left-0 z-20 w-48 py-1 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl">
                  {["Camera", "Gallery", "Files", "Web Search", "Connectors"].map((item) => (
                    <button key={item} onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white transition-colors">
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Input */}
          <TextareaAutosize
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind?"
            maxLength={8000}
            minRows={1}
            maxRows={6}
            className="flex-1 bg-transparent text-base text-white/60 placeholder:text-white/30 outline-none resize-none px-2 py-[10px] leading-relaxed"
          />

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setWebSearch(!webSearch)}
              className={webSearch
                ? "w-9 h-9 flex items-center justify-center rounded-full text-white bg-white/10"
                : "w-9 h-9 flex items-center justify-center rounded-full text-white/40 hover:text-white/60 hover:bg-white/10"}
            >
              <Globe className="w-4 h-4" />
            </button>

            {isStreaming ? (
              <button
                onClick={() => {
                  abortRef.current?.abort();
                  setIsStreaming(false);
                }}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:opacity-90 transition-opacity"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!value.trim()}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
