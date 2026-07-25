"use client";

import { useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ModeProvider, useMode } from "@/contexts/mode-context";
import { Sidebar } from "@/components/layout/sidebar";
import { SharedInput } from "@/components/shared-input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function ModesLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isCollapsed } = useSidebar();
  const { mode } = useMode();

  const segments = pathname.split("/").filter(Boolean);
  const isEmpty = segments.length <= 1;
  const conversationId = segments.length >= 2 ? segments[segments.length - 1] : null;

  const createChat = useMutation(trpc.conversations.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      router.push(`/${data.mode || mode}/${data.id}`);
    },
    onError: (err) => toast.error(err.message || "Failed to create"),
  }));

  const createMessage = useMutation(trpc.chatMessages.create.mutationOptions({
    onSuccess: (data) => {
      if (conversationId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        triggerAIResponse(data.content);
      }
    },
    onError: (err) => toast.error(err.message || "Failed to send"),
  }));

  const triggerAIResponse = useCallback(async (userMessage: string) => {
    if (!conversationId) return;
    try {
      const res = await fetch(`/api/chat/${conversationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        if (text.includes('"done"') || text.includes('"error"')) {
          if (conversationId) {
            queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
          }
        }
      }
    } catch (err) {
      toast.error("Failed to get AI response");
      if (conversationId) {
        queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      }
    }
  }, [conversationId, queryClient, trpc]);

  const handleSubmit = (content: string, submitMode: string) => {
    if (isEmpty) {
      createChat.mutate({ initialMessage: content, mode: submitMode });
    } else if (conversationId) {
      createMessage.mutate({ conversationId, content });
    }
  };

  const isPending = createChat.isPending || createMessage.isPending;

  return (
    <div className="min-h-screen flex">
      <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500 ease-in-out",
        isCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        <div className="flex-1 flex flex-col min-h-screen">
          <div className={cn(
            "flex-1 flex flex-col",
            isEmpty && "justify-center"
          )}>
            <div className={cn(
              isEmpty ? "" : "flex-1 overflow-y-auto thin-scrollbar"
            )}>
              {children}
            </div>
            <div className={cn(
              "flex-shrink-0 w-full",
              isEmpty ? "pb-6" : "bg-gradient-to-t from-background via-background to-transparent p-4"
            )}>
              <div className="mx-auto max-w-2xl">
                <SharedInput
                  onSubmit={handleSubmit}
                  isPending={isPending}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeProvider>
      <SidebarProvider>
        <ModesLayoutInner>{children}</ModesLayoutInner>
      </SidebarProvider>
    </ModeProvider>
  );
}
