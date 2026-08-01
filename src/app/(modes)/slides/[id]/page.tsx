"use client";

import { use } from "react";
import { ModeCanvas } from "@/components/modes/mode-canvas";

export default function SlidesContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <ModeCanvas mode="slides" conversationId={id} />
    </div>
  );
}
