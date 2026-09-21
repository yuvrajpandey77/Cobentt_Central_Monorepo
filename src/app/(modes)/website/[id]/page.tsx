"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { Globe, ArrowLeft } from "lucide-react";

export default function WebsiteContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/20 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/website")} className="text-text-secondary hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-medium text-white/80 truncate max-w-md">Website Builder</h1>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <Globe className="w-16 h-16 text-blue-400/50 mx-auto" />
          <p className="text-text-tertiary">Website canvas will render here</p>
          <p className="text-xs text-text-disabled">ID: {id}</p>
        </div>
      </div>
    </div>
  );
}
