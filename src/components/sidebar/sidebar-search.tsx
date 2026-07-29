"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarSearchProps {
  value: string;
  onChange: (value: string) => void;
  isCollapsed: boolean;
}

export function SidebarSearch({ value, onChange, isCollapsed }: SidebarSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex-shrink-0">
      <div className="relative">
        <Search className={cn(
          "absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-150",
          focused ? "text-foreground" : "text-muted-foreground"
        )} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search chats & projects..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full bg-card/40 text-foreground text-sm rounded-lg transition-all duration-150 outline-none",
            "placeholder:text-muted-foreground",
            focused ? "ring-2 ring-primary/20 border-primary/40" : "border-border/20",
            "border pl-10 pr-10 py-2.5"
          )}
        />
        <kbd className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5",
          "h-5 px-1.5 rounded text-[10px] font-medium text-muted-foreground border border-border/20 bg-card/20",
          focused && "opacity-0"
        )}>
          /
        </kbd>
      </div>
    </div>
  );
}
