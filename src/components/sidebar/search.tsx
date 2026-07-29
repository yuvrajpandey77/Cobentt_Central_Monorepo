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
  const [focused, setFocused] = useState(false);

  if (isCollapsed) return null;

  return (
    <div className="px-3 flex-shrink-0">
      <div className="relative">
        <Search className={cn(
          "absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-150",
          focused ? "text-foreground" : "text-muted-foreground"
        )} />
        <input
          type="text"
          placeholder="Search..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={cn(
            "w-full bg-card/40 text-foreground text-xs rounded-[12px] transition-all duration-150 outline-none h-9",
            "placeholder:text-muted-foreground",
            focused ? "ring-2 ring-primary/20 border-primary/40" : "border-border/20",
            "border pl-9 pr-8"
          )}
        />
        <kbd className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5",
          "h-4 px-1 rounded text-[9px] font-medium text-muted-foreground border border-border/20 bg-card/20",
          focused && "opacity-0"
        )}>
          /
        </kbd>
      </div>
    </div>
  );
}
