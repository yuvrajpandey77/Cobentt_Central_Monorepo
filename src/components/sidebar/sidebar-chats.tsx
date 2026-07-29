"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, ChevronDown } from "lucide-react";
import { isToday, isYesterday, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ConversationRow } from "./conversation-row";

interface SidebarChatsProps {
  conversations: any[];
  pathname: string;
  convRoute: (conv: any) => string;
  onRename: (conv: any) => void;
  onTogglePin: (conv: any) => void;
  onToggleArchive?: (conv: any) => void;
  onDelete: (conv: any) => void;
  isCollapsed: boolean;
}

function ChatGroup({
  label,
  conversations,
  pathname,
  convRoute,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete,
}: {
  label: string;
  conversations: any[];
  pathname: string;
  convRoute: (conv: any) => string;
  onRename: (conv: any) => void;
  onTogglePin: (conv: any) => void;
  onToggleArchive?: (conv: any) => void;
  onDelete: (conv: any) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 h-8 w-full rounded-lg hover:bg-card/40 transition-all duration-150"
      >
        <motion.div
          animate={{ rotate: open ? 0 : -90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </motion.div>
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">{conversations.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key={label}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-[1px] pb-1">
              {conversations.map((conv: any) => (
                <ConversationRow
                  key={conv.id}
                  conv={conv}
                  pathname={pathname}
                  convRoute={convRoute}
                  onRename={onRename}
                  onTogglePin={onTogglePin}
                  onToggleArchive={onToggleArchive || (() => {})}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SidebarChats(props: SidebarChatsProps) {
  const { conversations, isCollapsed, ...groupProps } = props;

  const grouped = useMemo(() => {
    const groups: { label: string; conversations: any[] }[] = [];
    const today: any[] = [];
    const yesterday: any[] = [];
    const thisWeek: any[] = [];
    const thisMonth: any[] = [];
    const older: any[] = [];

    for (const conv of conversations) {
      const date = new Date(conv.updatedAt);
      if (isToday(date)) today.push(conv);
      else if (isYesterday(date)) yesterday.push(conv);
      else if (differenceInDays(new Date(), date) <= 7) thisWeek.push(conv);
      else if (differenceInDays(new Date(), date) <= 30) thisMonth.push(conv);
      else older.push(conv);
    }

    if (today.length) groups.push({ label: "Today", conversations: today });
    if (yesterday.length) groups.push({ label: "Yesterday", conversations: yesterday });
    if (thisWeek.length) groups.push({ label: "Previous 7 Days", conversations: thisWeek });
    if (thisMonth.length) groups.push({ label: "Previous 30 Days", conversations: thisMonth });
    if (older.length) groups.push({ label: "Older", conversations: older });

    return groups;
  }, [conversations]);

  if (isCollapsed) return null;

  if (conversations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 px-3 h-8 mb-1">
        <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-white/40 uppercase tracking-wider">Chats</span>
      </div>
      <div className="space-y-[1px]">
        {grouped.map((group) => (
          <ChatGroup key={group.label} label={group.label} conversations={group.conversations} {...groupProps} />
        ))}
      </div>
    </div>
  );
}
