"use client";

import { useState, useRef, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { ArrowUp, X } from "lucide-react";
import { ModelSelector } from "@/modules/chat/ui/components/model-selector";
import { useMode, MODES } from "@/contexts/mode-context";
import { DEFAULT_MODEL } from "@/lib/models";
import { cn } from "@/lib/utils";

interface SharedInputProps {
  onSubmit: (content: string, mode: string) => void;
  isPending?: boolean;
  currentModel?: string;
  onModelChange?: (model: string) => void;
}

export function SharedInput({
  onSubmit,
  isPending,
  currentModel = DEFAULT_MODEL,
  onModelChange,
}: SharedInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, setMode } = useMode();
  const currentMode = MODES.find((m) => m.id === mode);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onSubmit(trimmed, mode);
    setValue("");
  }, [value, isPending, onSubmit, mode]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative border border-white/20 rounded-2xl bg-white/10 backdrop-blur-lg transition-all duration-200 shadow-xl">
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        minRows={1}
        maxRows={6}
        className="w-full resize-none border-none outline-none bg-transparent px-4 py-3 text-sm text-white/60 placeholder:text-white/30"
        placeholder="Ask anything..."
      />
      <div className="px-3 py-2 flex items-center justify-between border-t border-white/10">
        <div className="flex items-center gap-2">
          {/* Mode chip */}
          {currentMode && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/20 border border-primary/30 text-white/80">
              {currentMode.label}
              <button
                type="button"
                onClick={() => setMode("chat")}
                className="hover:text-white transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}

          {/* Model selector */}
          {onModelChange && (
            <ModelSelector
              currentModel={currentModel}
              onChange={onModelChange}
            />
          )}

          {value.length > 0 && (
            <div className="text-[10px] text-white/30">{value.length} chars</div>
          )}
        </div>
        <button
          type="button"
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
  );
}
