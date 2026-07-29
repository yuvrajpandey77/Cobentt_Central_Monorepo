"use client";

import { useEffect } from "react";
import { useChat } from "@/lib/chat-store";
import { ChatContent } from "../page";

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { selectThread } = useChat();

  useEffect(() => {
    params.then(({ conversationId }) => {
      selectThread(conversationId);
    });
  }, [params, selectThread]);

  return <ChatContent />;
}
