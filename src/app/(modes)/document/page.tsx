"use client";

import { FileText } from "lucide-react";
import { ModePills } from "@/components/mode-pills";

export default function DocsPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
            Write a document
          </h1>
          <p className="text-sm text-white/50">Describe the document you want to create</p>
        </div>
        <ModePills />
      </div>
    </div>
  );
}
