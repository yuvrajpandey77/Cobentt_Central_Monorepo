"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Message } from "@/lib/chat-store";
import { useChat } from "@/lib/chat-store";
import { cn } from "@/lib/utils";
import { FlowerLoader } from "@/components/flower-loader";
import { AttachmentPills } from "@/components/chat/attach-input";
import {
  Copy,
  Share2,
  RefreshCw,
  Pencil,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";

export function ThinkingLoader({ isStreaming }: { isStreaming: boolean }) {
  if (!isStreaming) return null;

  return <FlowerLoader />;
}

function ThinkingBlock({ text, time }: { text: string; time?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[11px] text-[var(--color-cb-text-muted)] hover:text-[var(--color-cb-text)] transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <span>Thought{time ? ` for ${time.toFixed(1)}s` : ""}</span>
      </button>
      {open && (
        <div className="mt-1.5 pl-4 border-l-2 border-[var(--color-cb-accent-muted)]">
          <p className="text-[12px] text-[var(--color-cb-text-muted)] leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      )}
    </div>
  );
}

function renderMarkdown(content: string) {
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
              <div className="px-3 py-1.5 text-[10px] font-mono text-[var(--color-cb-text-dim)] border-b border-[var(--color-cb-border)] bg-[var(--color-cb-bg)]/50">{codeLang}</div>
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
    } else if (line.startsWith("> ")) {
      parts.push(
        <blockquote key={`bq-${i}`} className="my-3 pl-4 py-2 border-l-2 border-[var(--color-cb-accent-muted)] text-[14px] text-[var(--color-cb-text-muted)] italic leading-relaxed">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith("---")) {
      parts.push(<hr key={`hr-${i}`} className="my-5 border-t border-[var(--color-cb-border)]" />);
    } else if (line.startsWith("- ")) {
      parts.push(<li key={`li-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] ml-5 list-disc mb-1.5 leading-relaxed">{renderInline(line.slice(2))}</li>);
    } else if (line.match(/^\d+\.\s/)) {
      parts.push(<li key={`oli-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] ml-5 list-decimal mb-1.5 leading-relaxed">{renderInline(line.replace(/^\d+\.\s/, ""))}</li>);
    } else if (line.trim() === "") {
      parts.push(<div key={`spacer-${i}`} className="h-2" />);
    } else {
      parts.push(<p key={`p-${i}`} className="text-[14px] text-[var(--color-cb-assistant-text)] leading-[1.75] mb-2">{renderInline(line)}</p>);
    }
  }

  if (inCode && codeLines.length) {
    parts.push(
      <div key="code-final" className="my-3 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[12px] bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] overflow-hidden">
        {codeLang && (
          <div className="px-3 py-1.5 text-[10px] font-mono text-[var(--color-cb-text-dim)] border-b border-[var(--color-cb-border)] bg-[var(--color-cb-bg)]/50">{codeLang}</div>
        )}
        <pre className="p-4 overflow-x-auto text-[13px] leading-[1.7] font-mono text-[var(--color-cb-assistant-text)]"><code>{codeLines.join("\n")}</code></pre>
      </div>
    );
  }

  return parts;
}

function renderInline(text: string) {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  const regex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push(remaining.slice(lastIndex, match.index));

    if (match[1]) {
      parts.push(
        <code key={`ic-${match.index}`} className="px-1.5 py-0.5 text-[13px] font-mono rounded border border-[var(--color-cb-accent-muted)] bg-[var(--color-cb-accent-muted)]/50 text-[var(--color-cb-text)]">{match[1].slice(1, -1)}</code>
      );
    } else if (match[2]) {
      parts.push(<strong key={`st-${match.index}`} className="font-semibold text-[var(--color-cb-text)]">{match[2].slice(2, -2)}</strong>);
    } else if (match[3]) {
      parts.push(<em key={`em-${match.index}`} className="italic">{match[3].slice(1, -1)}</em>);
    } else if (match[4]) {
      parts.push(
        <a key={`lk-${match.index}`} href={match[6]} className="text-white underline underline-offset-2 hover:opacity-80 decoration-[var(--color-cb-text-muted)]/30">
          {match[5]}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex));
  return parts;
}

function AssistantActions({ msg, onRegenerate }: { msg: Message; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = msg.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [msg.content]);

  const handleShare = useCallback(async () => {
    if (navigator.share) { try { await navigator.share({ text: msg.content }); } catch {} }
    else { await handleCopy(); }
  }, [msg.content, handleCopy]);

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={handleCopy} className="w-7 h-7 flex items-center justify-center rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[3px] rounded-br-[3px] hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-dim)] hover:text-[var(--color-cb-text-muted)] transition-all" title={copied ? "Copied" : "Copy"}>
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {onRegenerate && (
        <button onClick={onRegenerate} className="w-7 h-7 flex items-center justify-center rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[3px] rounded-br-[3px] hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-dim)] hover:text-[var(--color-cb-text-muted)] transition-all" title="Regenerate">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
      <button onClick={handleShare} className="w-7 h-7 flex items-center justify-center rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[3px] rounded-br-[3px] hover:bg-[var(--color-cb-card)] text-[var(--color-cb-text-dim)] hover:text-[var(--color-cb-text-muted)] transition-all" title="Share">
        <Share2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function MessageList({
  messages,
  isStreaming,
  onRegenerate,
}: {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate?: (userMessageId: string) => void;
}) {
  const { editMessage } = useChat();

  if (messages.length === 0) return null;

  const getPrevUserMessage = (idx: number): Message | null => {
    for (let i = idx - 1; i >= 0; i--) {
      if (messages[i].role === "user") return messages[i];
    }
    return null;
  };

  return (
    <div className="space-y-4 pb-4">
      {messages.map((msg, idx) => {
        const prevUser = getPrevUserMessage(idx);
        const isLastStreaming = isStreaming && idx === messages.length - 1 && msg.role === "assistant";

        return (
          <div key={msg.id} className={cn("animate-fade-in-up group", msg.role === "user" ? "flex justify-end" : "")}>
            {msg.role === "user" ? (
              <div className="max-w-[92%] group">
                <div className="px-4 py-3 rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[4px] rounded-br-[4px] bg-[var(--color-cb-user-bubble)]">
                  <AttachmentPills pills={msg.attachments ?? []} readOnly className="mb-2" />
                  <p className="text-[14px] text-[var(--color-cb-text-bright)] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => editMessage(msg.id)} className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--color-cb-text-dim)] hover:text-[var(--color-cb-text-muted)] transition-colors" title="Edit message">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-full px-0.5">
                {!isLastStreaming && msg.thinking && (
                  <ThinkingBlock text={msg.thinking} time={msg.thinkingTime} />
                )}
                {isLastStreaming && <ThinkingLoader isStreaming={true} />}
                <div>{renderMarkdown(msg.content)}</div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.sources.map((s) => (
                      <button key={s.index} className="flex items-center gap-1 px-2 py-1 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[3px] rounded-br-[3px] bg-[var(--color-cb-accent-muted)] hover:bg-[var(--color-cb-border)] transition-colors">
                        <span className="text-[10px] font-semibold text-[var(--color-cb-text-muted)]">{s.index}</span>
                        <span className="text-[10px] text-[var(--color-cb-text-dim)]">{s.title}</span>
                      </button>
                    ))}
                  </div>
                )}

                {msg.content && (
                  <div className="flex items-center justify-between mt-3">
                    <AssistantActions
                      msg={msg}
                      onRegenerate={prevUser && onRegenerate ? () => onRegenerate(prevUser.id) : undefined}
                    />
                    {msg.thinkingTime != null && msg.thinkingTime > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-[var(--color-cb-text-dim)]">
                        <Clock className="w-3 h-3" />
                        <span>Thought for {msg.thinkingTime.toFixed(1)}s</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
