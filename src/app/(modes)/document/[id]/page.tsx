"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { FileText, ArrowLeft } from "lucide-react";

export default function DocsContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0">
        <button onClick={() => router.push("/docs")} className="flex items-center gap-3 text-white/60 hover:text-white transition-colors"><ArrowLeft className="h-5 w-5" /> Back</button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <FileText className="w-16 h-16 text-amber-400/50 mx-auto" />
          <p className="text-white/40">Document editor will render here</p>
          <p className="text-xs text-white/20">ID: {id}</p>
        </div>
      </div>
    </div>
  );
}
