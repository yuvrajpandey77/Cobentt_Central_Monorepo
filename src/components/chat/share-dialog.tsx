"use client";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Lock, Link2, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ShareMode = "public" | "private";

export function ShareDialog({
  conversationId,
  focusMessageId,
  onClose,
}: {
  conversationId: string;
  focusMessageId?: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const status = useQuery(
    trpc.conversations.getShareStatus.queryOptions({ conversationId })
  );
  const isShared = status.data?.isPublic ?? false;
  const shareToken = status.data?.shareToken;

  const setShare = useMutation(
    trpc.conversations.setShare.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries(
          trpc.conversations.getShareStatus.queryOptions({ conversationId })
        );
        toast.success(data.isPublic ? "Sharing enabled" : "Sharing turned off");
      },
      onError: (err) => toast.error(err.message || "Failed to update sharing"),
    })
  );

  const shareUrl = shareToken
    ? `${window.location.origin}/p/${shareToken}${focusMessageId ? `#msg-${focusMessageId}` : ""}`
    : "";

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied to clipboard");
    }
  };

  const choose = (mode: ShareMode) => {
    setShare.mutate({ conversationId, isPublic: mode === "public" });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[var(--color-cb-card)] border border-[var(--color-cb-border)] rounded-tr-[20px] rounded-bl-[20px] rounded-tl-[6px] rounded-br-[6px] p-5 shadow-2xl animate-fade-in-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-cb-text-bright)]">Share</h3>
            <p className="text-[11px] text-[var(--color-cb-text-muted)] mt-1">
              Control who can view this conversation
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-text-tertiary hover:text-[var(--color-cb-text-bright)] hover:bg-[var(--color-cb-border)] transition-colors flex-shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          <button
            onClick={() => choose("public")}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[4px] rounded-br-[4px] border text-left transition-colors",
              isShared
                ? "border-[var(--color-cb-text-muted)] bg-[var(--color-cb-card)]"
                : "border-[var(--color-cb-border)] hover:border-[var(--color-cb-border-strong)]"
            )}
          >
            <Globe className="w-4 h-4 mt-0.5 text-[var(--color-cb-text-muted)]" />
            <span>
              <span className="block text-[12px] font-medium text-[var(--color-cb-text-bright)]">Anyone with the link</span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">
                Anyone who gets the link can view this chat read-only.
              </span>
            </span>
            {isShared && <Check className="w-4 h-4 ml-auto text-[var(--color-cb-text-bright)]" />}
          </button>

          <button
            onClick={() => choose("private")}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[4px] rounded-br-[4px] border text-left transition-colors",
              !isShared
                ? "border-[var(--color-cb-text-muted)] bg-[var(--color-cb-card)]"
                : "border-[var(--color-cb-border)] hover:border-[var(--color-cb-border-strong)]"
            )}
          >
            <Lock className="w-4 h-4 mt-0.5 text-[var(--color-cb-text-muted)]" />
            <span>
              <span className="block text-[12px] font-medium text-[var(--color-cb-text-bright)]">Only you</span>
              <span className="block text-[11px] text-text-tertiary mt-0.5">
                Private. Only the owner can view this conversation.
              </span>
            </span>
            {!isShared && <Check className="w-4 h-4 ml-auto text-[var(--color-cb-text-bright)]" />}
          </button>
        </div>

        {isShared && shareUrl && (
          <div className="mt-4">
            <label className="text-[10px] uppercase tracking-wider text-text-tertiary">Share link</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 min-w-0 bg-[var(--color-cb-input-bg)] border border-[var(--color-cb-border)] rounded-lg px-3 py-2 text-[11px] text-[var(--color-cb-text-muted)] outline-none"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white text-black text-[11px] font-medium hover:opacity-90 transition-opacity"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {setShare.isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-[inherit]">
            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-cb-text-muted)]" />
          </div>
        )}
      </div>
    </div>
  );
}