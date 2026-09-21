"use client";

import { useState, useRef, useEffect } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp } from "lucide-react";
import { ModelSelector } from "./model-selector";

interface ChatComposerProps {
  onSend: (content: string) => void;
  isPending: boolean;
  conversationId: string;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

export const ChatComposer = ({ onSend, isPending, conversationId, currentModel, onModelChange }: ChatComposerProps) => {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [conversationId]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="flex-shrink-0 border-t border-border/20 bg-gradient-to-t from-background via-background to-transparent p-4">
      <div className="max-w-4xl mx-auto">
        <div className="relative border border-white/20 rounded-2xl bg-white/10 backdrop-blur-lg transition-all duration-200 shadow-xl">
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
            minRows={1}
            maxRows={6}
            className="w-full resize-none border-none outline-none bg-transparent px-4 py-3 text-sm text-text-secondary placeholder:text-text-muted"
            placeholder="Type a message..."
          />
          <div className="px-3 py-2 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-2">
              {onModelChange && currentModel && (
                <ModelSelector
                  currentModel={currentModel}
                  onChange={onModelChange}
                />
              )}
              <div className="text-[10px] text-text-muted">
                {value.length > 0 && `${value.length} chars`}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || isPending}
              className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
            >
              {isPending ? (
                <span className="size-3.5 animate-spin border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <ArrowUp className="size-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
