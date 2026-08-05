"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, Loader2, ArrowRight, Calendar, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ModeListProps {
  mode: string;
  routePrefix: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

export function ModeList({ mode, routePrefix, icon, iconBg, iconColor, title, description }: ModeListProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const { data: items, isLoading, error } = useQuery(
    trpc.conversations.getByMode.queryOptions({ mode })
  );

  return (
    <div className="flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-center sm:text-left space-y-2">
            <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center mx-auto sm:mx-0`}>
              <div className={iconColor}>{icon}</div>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">{title}</h1>
              <p className="text-sm text-white/50">{description}</p>
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
            <p className="text-sm text-white/60">Failed to load {title.toLowerCase()}. Please try again.</p>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center mx-auto`}>
              <div className={iconColor}>{icon}</div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white/80">No {title.toLowerCase()} yet</h3>
              <p className="text-sm text-white/50 mt-1">Create your first one from the home page.</p>
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
              {items.length} {items.length === 1 ? "item" : "items"}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const preview = item.messages[0]?.content?.slice(0, 140) ?? "No content yet";
                return (
                  <Link key={item.id} href={`${routePrefix}/${item.id}`} className="group block">
                    <Card className="h-full transition-all duration-200 ease-out bg-white/[0.04] backdrop-blur-sm border-white/10 hover:border-white/30 hover:bg-white/[0.07] group-hover:scale-[1.02] overflow-hidden rounded-xl">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`flex-shrink-0 w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center`}>
                            <div className={`${iconColor} scale-75`}>{icon}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0 mt-0.5" />
                        </div>
                        <h3 className="text-sm font-semibold text-white line-clamp-1 mb-2">
                          {item.title || "Untitled"}
                        </h3>
                        <p className="text-xs text-white/50 line-clamp-2 mb-4 flex-1">
                          {preview}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-white/40">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
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

export function ModeListSkeleton() {
  return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="w-5 h-5 animate-spin text-white/40" />
    </div>
  );
}
