"use client";

import { use } from "react";
import { ResearchViewer } from "@/components/modes/research-viewer";

export default function DeepResearchContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="flex-1 flex h-full overflow-hidden">
      <ResearchViewer conversationId={id} />
    </div>
  );
}
