"use client";

import { cn } from "@/lib/utils";
import { Copy, ThumbsUp, ThumbsDown, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";

interface MessageBubbleProps {
  content: string;
  role: "USER" | "ASSISTANT";
  status?: string;
  modelUsed?: string | null;
  feedbackValue?: number | null;
  messageId?: string;
  conversationId?: string;
  onRegenerate?: () => void;
}

export const MessageBubble = ({
  content,
  role,
  status,
  modelUsed,
  feedbackValue,
  messageId,
  onRegenerate,
}: MessageBubbleProps) => {
  const isUser = role === "USER";
  const isStreaming = status === "STREAMING";
  const isError = status === "ERROR";
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const feedbackMutation = useMutation(trpc.chatMessages.feedback.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  }));

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className={cn(
      "flex gap-3 w-full group",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary/30 to-secondary/30 flex items-center justify-center border border-primary/20">
            <Image
              src="/cobentttransparent.webp"
              alt="Cobentt"
              width={20}
              height={20}
              className="rounded-full"
            />
          </div>
        </div>
      )}

      <div className={cn(
        "max-w-[80%] md:max-w-[70%] space-y-1",
        isUser && "items-end"
      )}>
        <div className={cn(
          "text-xs text-text-tertiary",
          isUser ? "text-right" : "text-left"
        )}>
          {isUser ? "You" : "Cobentt"}
          {modelUsed && !isUser && (
            <span className="ml-2 text-[10px] text-text-muted">via {modelUsed}</span>
          )}
        </div>

        <div className={cn(
          "rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary/20 border border-primary/30 text-white"
            : isError
              ? "bg-red-500/10 border border-red-500/30 text-red-200"
              : "bg-white/5 border border-white/10 text-white/90"
        )}>
          <div className="whitespace-pre-wrap break-words">
            {content || (isStreaming ? "" : "")}
            {isStreaming && (
              <span className="inline-block w-2 h-4 bg-white/60 ml-0.5 animate-pulse" />
            )}
          </div>
        </div>

        {/* Actions bar */}
        {!isUser && !isStreaming && !isError && (
          <div className="flex items-center gap-1 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={copyToClipboard} className="p-1 hover:text-text-secondary transition-colors" title="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="p-1 hover:text-text-secondary transition-colors" title="Regenerate">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            {messageId && (
              <>
                <button
                  onClick={() => feedbackMutation.mutate({ id: messageId, value: feedbackValue === 1 ? 0 : 1 })}
                  className={cn("p-1 transition-colors", feedbackValue === 1 ? "text-green-400" : "hover:text-text-secondary")}
                  title="Helpful"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => feedbackMutation.mutate({ id: messageId, value: feedbackValue === -1 ? 0 : -1 })}
                  className={cn("p-1 transition-colors", feedbackValue === -1 ? "text-red-400" : "hover:text-text-secondary")}
                  title="Not helpful"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">Failed to generate response</span>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </div>
      )}
    </div>
  );
};
