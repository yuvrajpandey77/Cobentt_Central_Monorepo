"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Plus, Globe, Send, Loader2, Check, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ResearchProgress } from "@/components/ui/research-progress";
import { AttachInput, AttachmentPills, type AttachInputHandle, type AttachmentMeta, type AttachmentPill } from "@/components/chat/attach-input";

export interface ModeChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: Date | string;
  attachments?: Array<{ id: string; fileName?: string; name?: string; size: number }>;
}

interface ModeChatPanelProps {
  messages: ModeChatMessage[];
  isPending: boolean;
  onSend: (content: string, attachmentIds?: string[]) => void;
  onRegenerate?: (userMessageId: string) => void;
  emptyText?: string;
  running?: boolean;
  runningText?: string;
  currentPhase?: string;
  progress?: number;
  conversationId?: string;
}

const THINKING_HINTS = [
  "Gathering relevant context…",
  "Planning the best approach…",
  "Mapping the task to the right model…",
  "Assembling your response…",
  "Verifying the output…",
  "Preparing your result…",
];

function ThinkingLoader({ isStreaming }: { isStreaming: boolean }) {
  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => setHintIndex((prev) => (prev + 1) % THINKING_HINTS.length), 2500);
    return () => clearInterval(interval);
  }, [isStreaming]);

  if (!isStreaming) return null;

  return (
    <div className="animate-fade-in-up mb-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[13px] font-medium text-[var(--color-cb-text-muted)]">Thinking</span>
      </div>
      <div className="relative overflow-hidden rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[4px] rounded-br-[4px] bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] px-4 py-3">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer" />
        <p key={hintIndex} className="relative text-[12px] text-[var(--color-cb-text-muted)] animate-fade-in-up">{THINKING_HINTS[hintIndex]}</p>
      </div>
    </div>
  );
}

function ChatMarkdown({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  const lines = content.split("\n");
  let inCode = false;
  let codeLines: string[] = [];
  let codeLang = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("```")) {
      if (inCode) {
        parts.push(
          <div key={`code-${i}`} className="my-3 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[12px] bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] overflow-hidden">
            {codeLang && (
              <div className="px-3 py-1.5 text-[10px] font-mono text-text-tertiary border-b border-[var(--color-cb-border)] bg-[var(--color-cb-bg)]/50">{codeLang}</div>
            )}
            <pre className="p-4 overflow-x-auto text-[13px] leading-[1.7] font-mono text-[var(--color-cb-assistant-text)]"><code>{codeLines.join("\n")}</code></pre>
          </div>
        );
        codeLines = [];
        inCode = false;
        codeLang = "";
      } else {
        inCode = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }
    if (line.startsWith("### ")) {
      parts.push(<h3 key={`h3-${i}`} className="text-[15px] font-semibold text-[var(--color-cb-text)] mt-5 mb-2">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      parts.push(<h2 key={`h2-${i}`} className="text-[17px] font-bold text-[var(--color-cb-text)] mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith("- ")) {
      parts.push(<li key={`li-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] ml-5 list-disc mb-1.5 leading-relaxed">{line.slice(2)}</li>);
    } else if (line.match(/^\d+\.\s/)) {
      parts.push(<li key={`oli-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] ml-5 list-decimal mb-1.5 leading-relaxed">{line.replace(/^\d+\.\s/, "")}</li>);
    } else if (line.trim() === "") {
      parts.push(<div key={`spacer-${i}`} className="h-2" />);
    } else {
      parts.push(<p key={`p-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] leading-[1.75] mb-2">{line}</p>);
    }
  }
  if (inCode && codeLines.length) {
    parts.push(
      <div key="code-final" className="my-3 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[12px] bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] overflow-hidden">
        <pre className="p-4 overflow-x-auto text-[13px] leading-[1.7] font-mono text-[var(--color-cb-assistant-text)]"><code>{codeLines.join("\n")}</code></pre>
      </div>
    );
  }
  return <>{parts}</>;
}

function ModeChatComposer({
  onSend,
  isPending,
  conversationId,
}: {
  onSend: (c: string, attachmentIds?: string[]) => void;
  isPending: boolean;
  conversationId?: string;
}) {
  const [value, setValue] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);
  const [pendingPills, setPendingPills] = useState<AttachmentPill[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachRef = useRef<AttachInputHandle>(null);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0 && pendingPills.length === 0) || isPending) return;
    if (pendingPills.length > 0 && !conversationId) {
      toast.error("Please wait for the conversation to be ready and attach again");
      return;
    }
    onSend(trimmed, attachments.map((a) => a.id));
    setValue("");
    setShowMenu(false);
    setAttachments([]);
    setPendingPills([]);
  };

  const addAttachment = (a: AttachmentMeta) =>
    setAttachments((prev) => [...prev, a]);
  const removeAttachment = (id: string) =>
    setAttachments((prev) => prev.filter((a) => a.id !== id));

  const pillItems: AttachmentPill[] = [
    ...pendingPills,
    ...attachments.map((a) => ({ id: a.id, name: a.fileName, size: a.size })),
  ];

  return (
    <div className="flex-shrink-0 px-3 pb-3 pt-1 bg-[var(--color-cb-bg)]">
      <AttachmentPills
        pills={pillItems}
        onRemove={(id) => {
          const pendingId = pendingPills.find((p) => p.id === id)?.id;
          if (pendingId) {
            attachRef.current?.removePending(id);
          } else {
            removeAttachment(id);
          }
        }}
        className="mb-2 px-1"
      />
      <div className="relative border border-white/20 rounded-3xl bg-white/10 backdrop-blur-lg shadow-xl transition-all duration-200 ease-out cursor-text">
        <div className="flex items-center gap-1.5 px-3 py-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-text-secondary flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute bottom-11 left-0 z-20 w-48 py-1 bg-black/90 backdrop-blur-lg border border-white/20 rounded-xl shadow-xl">
                  {["Camera", "Gallery", "Files", "Web Search", "Connectors"].map((item) => (
                    <button key={item} onClick={() => setShowMenu(false)} className="w-full text-left px-3 py-2.5 text-sm text-text-secondary hover:bg-white/10 hover:text-white transition-colors">
                      {item}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <TextareaAutosize
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What's on your mind?"
            maxLength={8000}
            minRows={1}
            maxRows={6}
            className="flex-1 bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none resize-none px-2 py-[10px] leading-relaxed"
          />

          <div className="flex items-center gap-1.5">
            <AttachInput
              ref={attachRef}
              conversationId={conversationId}
              onAttach={addAttachment}
              onRemove={removeAttachment}
              attachments={attachments}
              disabled={isPending}
              onPendingChange={setPendingPills}
            />
            <button
              type="button"
              className="w-9 h-9 flex items-center justify-center rounded-full text-text-tertiary hover:text-text-secondary hover:bg-white/10"
              title="Web search"
            >
              <Globe className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={(!value.trim() && attachments.length === 0 && pendingPills.length === 0) || isPending}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModeChatPanel({
  messages,
  isPending,
  onSend,
  onRegenerate,
  emptyText = "Ask the AI to help build or edit this content.",
  running,
  runningText = "Working...",
  currentPhase,
  progress,
  conversationId,
}: ModeChatPanelProps) {
  const [width, setWidth] = useState(340);
  const draggingRef = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      setWidth(Math.min(560, Math.max(280, startWidth - (ev.clientX - startX))));
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ew-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [width]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const copy = async (msg: ModeChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const sorted = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      ),
    [messages]
  );

  const getPrevUser = (idx: number): ModeChatMessage | null => {
    for (let i = idx - 1; i >= 0; i--) {
      if (sorted[i].role === "USER") return sorted[i];
    }
    return null;
  };

  return (
    <div
      className="hidden md:flex flex-col flex-shrink-0 border-l border-[var(--color-cb-border)] bg-[var(--color-cb-bg)] relative min-h-0"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize z-10 hover:bg-primary/30 transition-colors"
        style={{ marginLeft: -3 }}
        title="Drag to resize"
      />

      <div className="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-3 space-y-4">
        {sorted.map((msg, idx) => {
          const prevUser = getPrevUser(idx);
          const isAssistant = msg.role === "ASSISTANT";
          const isLastAssistant = isAssistant && idx === sorted.length - 1;
          return (
            <div key={msg.id} className={cn(isAssistant ? "" : "flex justify-end")}>
              {isAssistant ? (
                <div>
                  {msg.content ? (
                    <div className="bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5">
                      <ChatMarkdown content={msg.content} />
                    </div>
                  ) : (
                    <div className="relative bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[4px] px-3 py-2.5 flex items-center gap-2 text-[12px] text-[var(--color-cb-text-muted)] min-h-[36px]">
                      {running && progress !== undefined ? (
                        <ResearchProgress
                          currentPhase={currentPhase}
                          progress={progress}
                          running={running}
                          runningText={runningText}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
                        </div>
                      )}
                    </div>
                  )}
                  {msg.content && (
                    <div className="flex items-center gap-0.5 mt-1.5">
                      <button onClick={() => copy(msg)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-cb-card)] text-text-tertiary hover:text-text-secondary transition-all" title={copiedId === msg.id ? "Copied" : "Copy"}>
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {onRegenerate && prevUser && !isLastAssistant && (
                        <button onClick={() => onRegenerate(prevUser.id)} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-cb-card)] text-text-tertiary hover:text-text-secondary transition-all" title="Regenerate">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-[92%] px-4 py-3 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[4px] bg-[var(--color-cb-user-bubble)]">
                  <AttachmentPills
                    pills={(msg.attachments ?? []).map((a) => ({
                      id: a.id,
                      name: a.fileName ?? a.name ?? "file",
                      size: a.size,
                    }))}
                    readOnly
                    className="mb-2"
                  />
                  <p className="text-[14px] text-[var(--color-cb-text-bright)] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
            </div>
          );
        })}

        {isPending && <ThinkingLoader isStreaming />}

        {running && (
          <div className="flex items-center gap-2 text-[var(--color-cb-text-muted)] justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs">{runningText}</span>
          </div>
        )}

        {sorted.length === 0 && !running && !isPending && (
          <p className="text-text-tertiary text-xs text-center py-8 px-2 leading-relaxed">{emptyText}</p>
        )}
      </div>

      <ModeChatComposer onSend={onSend} isPending={isPending} conversationId={conversationId} />
    </div>
  );
}
