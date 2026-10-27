"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { MessageList } from "../components/message-list";
import { ChatComposer } from "../components/chat-composer";
import { ModelSelector } from "../components/model-selector";
import { ChatSkeleton } from "../components/chat-skeleton";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { defaultModelFor } from "@/lib/models";
import { useByok } from "@/hooks/use-byok";

interface ChatViewProps {
  conversationId: string;
}

export const ChatView = ({ conversationId }: ChatViewProps) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: conversation, isLoading } = useQuery({
    ...trpc.conversations.getById.queryOptions({ id: conversationId }),
  });

  const deleteConversation = useMutation(trpc.conversations.delete.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getAll.queryOptions());
      toast.success("Chat deleted");
      router.push("/chat");
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  }));

  const updateConversation = useMutation(trpc.conversations.update.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
    },
  }));

  const createMessage = useMutation(trpc.chatMessages.create.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      triggerAIResponse(data.content);
    },
    onError: (err) => toast.error(err.message || "Failed to send"),
  }));

  const regenerateMessage = useMutation(trpc.chatMessages.regenerate.mutationOptions({
    onSuccess: (data) => {
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
      triggerAIResponse(data.userMessageContent);
    },
    onError: (err) => toast.error(err.message || "Failed to regenerate"),
  }));

  const { providers: keyProviders } = useByok();
  const currentModel = conversation?.model || defaultModelFor(keyProviders);

  const handleModelChange = (model: string) => {
    updateConversation.mutate({ id: conversationId, model });
  };

  const triggerAIResponse = useCallback(async (userMessage: string) => {
    try {
      const res = await fetch(`/api/chat/${conversationId}/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, model: currentModel }),
      });
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Read the SSE stream to update the conversation when done
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });
        // On done or error, invalidate
        if (text.includes('"done"') || text.includes('"error"')) {
          queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
        }
      }
    } catch {
      toast.error("Failed to get AI response");
      queryClient.invalidateQueries(trpc.conversations.getById.queryOptions({ id: conversationId }));
    }
  }, [conversationId, currentModel, queryClient, trpc]);

  const handleSend = (content: string) => {
    createMessage.mutate({ conversationId, content });
  };

  const handleRegenerate = (userMessageId: string) => {
    regenerateMessage.mutate({ conversationId, userMessageId });
  };

  if (isLoading) {
    return <ChatSkeleton />;
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-text-secondary">Conversation not found</p>
          <Link href="/chat" className="text-primary hover:underline">Back to chats</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/chat" className="text-text-secondary hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
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
            className="text-text-tertiary hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList
        messages={conversation.messages || []}
        conversationId={conversationId}
        onRegenerate={handleRegenerate}
      />

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        isPending={createMessage.isPending}
        conversationId={conversationId}
        currentModel={currentModel}
        onModelChange={handleModelChange}
      />
    </div>
  );
};
