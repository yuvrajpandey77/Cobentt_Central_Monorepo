"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient, skipToken } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { MessageList } from "@/components/chat/message-list";
import { Lock, Brain, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function mapSharedMessage(m: {
  id: string; content: string; role: string;
  thinking?: unknown; sources?: unknown; attachments?: unknown;
}): {
  id: string; role: "user" | "assistant"; content: string; timestamp: number;
  thinking?: string; sources?: { index: number; title: string }[];
  attachments?: { id: string; name: string; size: number }[];
} {
  return {
    id: m.id,
    role: (m.role || "assistant").toLowerCase() as "user" | "assistant",
    content: m.content,
    timestamp: 0,
    thinking: typeof m.thinking === "string" ? m.thinking : undefined,
    sources: Array.isArray(m.sources) ? (m.sources as { index: number; title: string }[]) : undefined,
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as { id: string; fileName?: string; name?: string; size: number }[])
          .map((a) => ({ id: a.id, name: a.fileName ?? a.name ?? "file", size: a.size }))
      : undefined,
  };
}

export default function SharedChatPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();

  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    params.then((p) => { if (!cancelled) setToken(p.token); });
    return () => { cancelled = true; };
  }, [params]);

  const shared = useQuery(
    trpc.conversations.getSharedByToken.queryOptions(token ? { token } : skipToken)
  );

  const fork = useMutation(
    trpc.conversations.forkShared.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
        router.push(`/chat/${data.id}`);
      },
      onError: (err) => toast.error(err.message || "Failed to create your own copy"),
    })
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.startsWith("#msg-")) {
        setTimeout(() => {
          const el = document.getElementById(hash.slice(1));
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.classList.add("ring-2", "ring-primary/40", "rounded-lg");
        }, 200);
      }
    }
  }, [shared.data?.messages]);

  const handleFork = () => {
    if (!authLoaded) return;
    if (!isSignedIn) {
      router.push(`/sign-in?redirect_url=/p/${token}`);
      return;
    }
    if (token) fork.mutate({ token });
  };

  const [copied, setCopied] = useState(false);

  const handleCopyTranscript = async () => {
    try {
      const text = (shared.data?.messages ?? [])
        .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
        .map((m) => `${m.role === "USER" ? "You" : "Assistant"}:\n${m.content}`)
        .join("\n\n");
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Conversation copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy conversation");
    }
  };

  if (shared.isLoading || !token) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--color-cb-bg)]">
        <div className="w-5 h-5 border-2 border-[var(--color-cb-border-strong)] border-t-[var(--color-cb-text-muted)] rounded-full animate-spin" />
      </div>
    );
  }

  if (shared.isError || !shared.data) {
    return (
      <div className="h-dvh flex items-center justify-center bg-[var(--color-cb-bg)] px-6">
        <div className="text-center max-w-sm">
          <Lock className="w-8 h-8 mx-auto text-text-tertiary" />
          <h1 className="mt-3 text-sm font-semibold text-[var(--color-cb-text-bright)]">This shared chat isn&apos;t available</h1>
          <p className="mt-1 text-xs text-text-tertiary">
            The link may be wrong, or sharing was turned off.
          </p>
        </div>
      </div>
    );
  }

  const conversation = shared.data;
  const messages = (conversation.messages || [])
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map(mapSharedMessage);

  return (
    <div className="flex h-dvh bg-[var(--color-cb-bg)]">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 h-12 bg-[var(--color-cb-bg)] border-b border-[var(--color-cb-border)]">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" />
            <span className="text-[11px] text-[var(--color-cb-text-muted)] truncate">
              Shared chat · view only
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-medium transition-colors bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] hover:bg-[var(--color-cb-card-hover)] text-[var(--color-cb-text-muted)]"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy conversation"}
            </button>
            <button
              onClick={handleFork}
              disabled={fork.isPending}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-medium transition-colors",
                "bg-white text-black hover:opacity-90 disabled:opacity-50"
              )}
            >
              {fork.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Start your own from this chat
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto chat-scrollbar px-4">
          <div className="max-w-[800px] mx-auto pt-6">
            {conversation.title && (
              <h1 className="text-sm font-semibold text-[var(--color-cb-text-bright)] mb-4">
                {conversation.title}
              </h1>
            )}
            <MessageList
              messages={messages}
              isStreaming={false}
              conversationId={conversation.id}
              readOnly
            />
            {messages.length === 0 && (
              <p className="text-xs text-text-tertiary text-center py-10">No messages to show.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}