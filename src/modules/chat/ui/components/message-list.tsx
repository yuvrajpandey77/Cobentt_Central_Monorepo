"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";

interface Message {
  id: string;
  content: string;
  role: "USER" | "ASSISTANT";
  status?: string;
  modelUsed?: string | null;
  feedbackValue?: number | null;
  createdAt: string | Date;
}

interface MessageListProps {
  messages: Message[];
  conversationId: string;
  onRegenerate?: (userMessageId: string) => void;
}

export const MessageList = ({ messages, onRegenerate }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 100;
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-text-tertiary text-sm">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto py-6 thin-scrollbar"
    >
      <div className="max-w-2xl mx-auto space-y-6 px-4">
      {messages.map((message, idx) => {
        // Find the previous user message for regenerate
        const prevUserMessage = message.role === "ASSISTANT"
          ? [...messages].slice(0, idx).reverse().find((m) => m.role === "USER")
          : null;

        return (
          <MessageBubble
            key={message.id}
            content={message.content}
            role={message.role}
            status={message.status}
            modelUsed={message.modelUsed}
            feedbackValue={message.feedbackValue}
            messageId={message.id}
            conversationId={""}
            onRegenerate={
              message.role === "ASSISTANT" && prevUserMessage && onRegenerate
                ? () => onRegenerate(prevUserMessage.id)
                : undefined
            }
          />
        );
      })}
      <div ref={bottomRef} />
      </div>
    </div>
  );
};
