"use client";

import { MessageCircle } from "lucide-react";
import { ModePills } from "@/components/mode-pills";
import { getDailyGreeting } from "@/lib/greetings";

export default function ChatPage() {
  const { heading } = getDailyGreeting();

  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mx-auto">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
            {heading}
          </h1>
        </div>
        <ModePills />
      </div>
    </div>
  );
}
