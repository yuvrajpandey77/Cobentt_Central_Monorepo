"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useChat } from "@/lib/chat-store";
import { Sidebar } from "@/components/layout/sidebar";
import { MessageList } from "@/components/chat/message-list";
import { Composer } from "@/components/chat/composer";
import type { Message } from "@/lib/chat-store";
import { Menu, Share2 } from "lucide-react";
import { takePendingFiles } from "@/lib/attachments/shuttle";
import { ShareDialog } from "@/components/chat/share-dialog";
import { ByokGate } from "@/components/byok-gate";

function ContextRing() {
  const { activeThread } = useChat();
  const approxTokens = (activeThread?.messages ?? [])
    .reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
  const maxContext = 128000;
  const used = Math.min(Math.round((approxTokens / maxContext) * 100), 100);
  return (
    <div className="relative w-12 h-12 flex items-center justify-center group">
      <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-cb-border)" strokeWidth="2.5" />
        <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-cb-accent)" strokeWidth="2.5"
          strokeDasharray={`${(used / 100) * 69.1} 69.1`} strokeLinecap="round" />
      </svg>
      <span className="text-[10px] font-semibold text-[var(--color-cb-text-muted)]">{used}%</span>
      <div className="absolute top-full mt-2 right-0 hidden group-hover:block px-2.5 py-1.5 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] text-[11px] text-[var(--color-cb-text-muted)] max-w-[200px] z-10">
        Context: {approxTokens.toLocaleString()} / {maxContext.toLocaleString()} tokens
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" />
  );
}

export function ChatContent() {
  const { activeThread, sidebarOpen, setSidebarOpen } = useChat();
  const { isLoaded } = useUser();
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const [streamingMsg, setStreamingMsg] = useState<Message | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingUserMsg, setPendingUserMsg] = useState<Message | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [incomingFiles, setIncomingFiles] = useState<File[]>([]);
  const [regenerateRequest, setRegenerateRequest] = useState<{ userMessageId: string; content: string } | null>(null);

  // Files queued on the root page and carried here via the module shuttle
  useEffect(() => {
    setIncomingFiles(takePendingFiles());
  }, []);

  // Read ?q= from URL for prompts coming from the root page
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      const trimmed = q.trim();
      if (trimmed) {
        const url = new URL(window.location.href);
        url.searchParams.delete("q");
        window.history.replaceState({}, "", url.toString());
        setInitialPrompt(trimmed);
      }
    }
  }, [searchParams]);

  const displayMessages = useMemo(() => {
    const messages = activeThread?.messages || [];
    const last = messages[messages.length - 1];
    const alreadyHasPending =
      pendingUserMsg &&
      last?.role === "user" &&
      last.content === pendingUserMsg.content;
    const allMessages =
      pendingUserMsg && !alreadyHasPending ? [...messages, pendingUserMsg] : messages;
    return streamingMsg ? [...allMessages, streamingMsg] : allMessages;
  }, [activeThread?.messages, pendingUserMsg, streamingMsg]);

  const handleUserMessage = (msg: Message) => {
    setPendingUserMsg(msg);
  };

  const handleStreamMessage = (msg: Message | null) => {
    if (msg === null) setPendingUserMsg(null);
    setStreamingMsg(msg);
  };

  const handleRegenerate = (userMessageId: string) => {
    const userMsg = (activeThread?.messages || []).find(
      (m) => m.id === userMessageId && m.role === "user"
    );
    if (!userMsg || !activeThread) return;
    setRegenerateRequest({ userMessageId, content: userMsg.content });
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (userScrolledUpRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [displayMessages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (!el) return;
      const threshold = 100;
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > threshold;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="h-dvh flex bg-[var(--color-cb-bg)]">
        <aside className="w-[280px] border-r border-[var(--color-cb-border)] flex flex-col" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-5 h-5 border-2 border-[var(--color-cb-border-strong)] border-t-[var(--color-cb-text-muted)] rounded-full animate-spin" />
          <p className="text-xs text-[var(--color-cb-text-dim)] mt-4">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ByokGate>
    <div id="chat-workspace" className="flex h-dvh bg-[var(--color-cb-bg)]">
      <Sidebar dataSource="local" />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 h-12 bg-[var(--color-cb-bg)] -mt-0.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-8 h-8 flex items-center justify-center rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[24px] rounded-br-[24px] hover:bg-[var(--color-cb-card)] transition-colors text-[var(--color-cb-text-muted)] overflow-hidden"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ContextRing />
            {activeThread && (
              <button
                onClick={() => setShareOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-tr-[24px] rounded-bl-[24px] rounded-tl-[8px] rounded-br-[8px] bg-[var(--color-cb-card)] hover:bg-[var(--color-cb-border)] transition-colors text-[var(--color-cb-text-muted)]"
                title="Share chat"
              >
                <Share2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto chat-scrollbar px-4">
          <div className="max-w-[800px] mx-auto pt-6">
            {displayMessages.length === 0 && !streamingMsg ? (
              <EmptyState />
            ) : (
              <MessageList
                messages={displayMessages}
                isStreaming={!!streamingMsg}
                onRegenerate={handleRegenerate}
                conversationId={activeThread?.id}
              />
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pb-5 pt-2 bg-[var(--color-cb-bg)]">
          <Composer
            onStreamMessage={handleStreamMessage}
            onUserMessage={handleUserMessage}
            initialPrompt={initialPrompt}
            initialFiles={incomingFiles}
            regenerateRequest={regenerateRequest}
            onRegenerateHandled={() => setRegenerateRequest(null)}
          />
        </div>
      </div>

      {shareOpen && activeThread && (
        <ShareDialog conversationId={activeThread.id} onClose={() => setShareOpen(false)} />
      )}
    </div>
    </ByokGate>
  );
}
