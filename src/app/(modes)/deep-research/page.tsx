"use client";

import { Search } from "lucide-react";
import { ModePills } from "@/components/mode-pills";

export default function DeepResearchPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
            Deep research
          </h1>
          <p className="text-sm text-white/50">Describe your research topic</p>
        </div>
        <ModePills />
      </div>
    </div>
  );
}
