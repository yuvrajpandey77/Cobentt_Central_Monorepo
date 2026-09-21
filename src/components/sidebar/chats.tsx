"use client";

import { useMemo } from "react";
import { isToday, isYesterday, differenceInDays } from "date-fns";
import { ConversationRow } from "./conversation-row";
import type { SidebarConversation } from "./types";

type ConversationEntry = Omit<SidebarConversation, "updatedAt" | "title"> & {
  title?: string | null;
  updatedAt: Date | string;
};

interface SidebarChatsProps {
  conversations: ConversationEntry[];
  pathname: string;
  convRoute: (conv: ConversationEntry) => string;
  onRename: (conv: ConversationEntry) => void;
  onTogglePin: (conv: ConversationEntry) => void;
  onToggleArchive: (conv: ConversationEntry) => void;
  onDelete: (conv: ConversationEntry) => void;
  isCollapsed: boolean;
  emptyMessage?: string;
}

function ChatGroup({ label, conversations, ...rowProps }: {
  label: string;
  conversations: ConversationEntry[];
  pathname: string;
  convRoute: (conv: ConversationEntry) => string;
  onRename: (conv: ConversationEntry) => void;
  onTogglePin: (conv: ConversationEntry) => void;
  onToggleArchive: (conv: ConversationEntry) => void;
  onDelete: (conv: ConversationEntry) => void;
}) {
  if (conversations.length === 0) return null;

  return (
    <div>
      <div className="flex items-center h-8 px-4">
        <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-muted-foreground/40 ml-auto">{conversations.length}</span>
      </div>
      <div className="space-y-[1px]">
        {conversations.map((conv: ConversationEntry) => (
          <ConversationRow key={conv.id} conv={conv} {...rowProps} />
        ))}
      </div>
    </div>
  );
}

export function SidebarChats(props: SidebarChatsProps) {
  const { conversations, isCollapsed, emptyMessage = "No conversations yet", ...groupProps } = props;

  const grouped = useMemo(() => {
    const today: ConversationEntry[] = [];
    const yesterday: ConversationEntry[] = [];
    const thisWeek: ConversationEntry[] = [];
    const older: ConversationEntry[] = [];

    for (const conv of conversations) {
      const date = new Date(conv.updatedAt);
      if (isToday(date)) today.push(conv);
      else if (isYesterday(date)) yesterday.push(conv);
      else if (differenceInDays(new Date(), date) <= 7) thisWeek.push(conv);
      else older.push(conv);
    }

    return [
      { label: "Today", conversations: today },
      { label: "Yesterday", conversations: yesterday },
      { label: "Previous 7 Days", conversations: thisWeek },
      { label: "Older", conversations: older },
    ].filter(g => g.conversations.length > 0);
  }, [conversations]);

  if (isCollapsed) return null;
  if (conversations.length === 0) {
    return <div className="px-4 py-6 text-center"><p className="text-xs text-muted-foreground">{emptyMessage}</p></div>;
  }

  return (
    <div className="space-y-[1px]">
      {grouped.map((group) => (
        <ChatGroup key={group.label} label={group.label} conversations={group.conversations} {...groupProps} />
      ))}
    </div>
  );
}
