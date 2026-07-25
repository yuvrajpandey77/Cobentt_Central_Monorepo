"use client";

import { use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMode, MODES } from "@/contexts/mode-context";
import { MessageList } from "@/modules/chat/ui/components/message-list";
import { ModelSelector } from "@/modules/chat/ui/components/model-selector";
import { ArrowLeft, Trash2 } from "lucide-react";
import { DEFAULT_MODEL } from "@/lib/models";
import { toast } from "sonner";

export default function ChatConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: conversationId } = use(params);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { setMode } = useMode();
  const { data: conversation, isLoading } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: conversationId }),
  });

  const currentModel = conversation?.model || DEFAULT_MODEL;

  const updateConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
    },
  }));

  const deleteConversation = useMutation(trpc.conversations.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      toast.success("Chat deleted");
      router.push("/chat");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const regenerateMessage = useMutation(trpc.chatMessages.regenerate.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      triggerAIResponse(data.userMessageContent);
    },
    onError: (err) => toast.error(err.message || "Failed to regenerate"),
  }));

  const triggerAIResponse = useCallback(async (userMessage: string) => {
    try {
      const res = await fetch(`/api/chat/${conversationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, model: currentModel }),
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
          queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        }
      }
    } catch (err) {
      toast.error("Failed to get AI response");
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
    }
  }, [conversationId, currentModel, queryClient, trpc]);

  const handleModelChange = (model: string) => {
    updateConversation.mutate({ id: conversationId, model });
  };

  const handleRegenerate = (userMessageId: string) => {
    regenerateMessage.mutate({ conversationId, userMessageId });
  };

  const handleNewChat = () => {
    setMode("chat");
    router.push("/chat");
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-center space-y-4">
          <p className="text-white/60">Conversation not found</p>
          <button onClick={handleNewChat} className="text-primary hover:underline">Back to chats</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={handleNewChat} className="text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium text-white/80 truncate max-w-md">
            {conversation.title || "Chat"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector
            currentModel={currentModel}
            onChange={handleModelChange}
          />
          <button
            onClick={() => deleteConversation.mutate({ id: conversationId })}
            className="text-white/40 hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <MessageList
        messages={conversation.messages || []}
        conversationId={conversationId}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}
