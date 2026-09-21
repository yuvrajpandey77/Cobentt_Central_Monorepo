"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, FolderOpen, ArrowRight, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const MODE_ICONS: Record<string, { bg: string; color: string }> = {
  chat: { bg: "bg-blue-500/20", color: "text-blue-400" },
  "deep-research": { bg: "bg-violet-500/20", color: "text-violet-400" },
  slides: { bg: "bg-amber-500/20", color: "text-amber-400" },
  document: { bg: "bg-emerald-500/20", color: "text-emerald-400" },
  sheet: { bg: "bg-cyan-500/20", color: "text-cyan-400" },
  website: { bg: "bg-pink-500/20", color: "text-pink-400" },
  "smart-contract": { bg: "bg-orange-500/20", color: "text-orange-400" },
};

function getModeStyle(mode: string | null) {
  return MODE_ICONS[mode || "chat"] || MODE_ICONS.chat;
}

export function ChatList() {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: conversations, isLoading, error } = useQuery(
    trpc.conversations.getAll.queryOptions()
  );

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-3">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto sm:mx-0">
              <div className="text-blue-400">
                <MessageCircle className="w-6 h-6" />
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-white">Your chats</h1>
              <p className="text-sm text-white/50">Open an existing chat, or start a new one from the home page.</p>
            </div>
          </div>
          <div className="flex justify-center sm:justify-end">
            <Button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-full"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-xl border border-white/10 bg-white/[0.03] animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <FolderOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/60">Failed to load chats. Please try again.</p>
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
              <div className="text-blue-400">
                <MessageCircle className="w-6 h-6" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/80">No chats yet</h3>
              <p className="text-sm text-white/50 mt-1">Start a conversation from the home page.</p>
            </div>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create
            </Button>
          </div>
        ) : (
          <>
            <p className="text-xs text-white/40">
              {conversations.length} {conversations.length === 1 ? "chat" : "chats"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {conversations.map((conv) => {
                const preview = conv.messages[0]?.content?.slice(0, 140) ?? "No content yet";
                const style = getModeStyle(conv.mode);
                const route = `/${conv.mode || "chat"}/${conv.id}`;
                return (
                  <Link key={conv.id} href={route} className="group block">
                    <Card className="h-full transition-all duration-200 ease-out bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-white/[0.07] group-hover:scale-[1.02] overflow-hidden rounded-xl">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`flex-shrink-0 w-9 h-9 ${style.bg} rounded-lg flex items-center justify-center`}>
                            <div className={`${style.color} scale-75`}>
                              <MessageCircle className="w-6 h-6" />
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                        <h3 className="text-sm font-semibold text-white line-clamp-1 mb-2">
                          {conv.title || "Untitled chat"}
                        </h3>
                        <p className="text-xs text-white/50 line-clamp-2 mb-4 flex-1">
                          {preview}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(conv.createdAt), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
