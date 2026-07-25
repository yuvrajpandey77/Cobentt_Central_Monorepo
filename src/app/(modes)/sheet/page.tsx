"use client";

import { FileSpreadsheet } from "lucide-react";
import { ModePills } from "@/components/mode-pills";

export default function SheetPage() {
  return (
    <div className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-b from-white via-neutral-200 to-white">
            Create a spreadsheet
          </h1>
          <p className="text-sm text-white/50">Describe the data you want to organize</p>
        </div>
        <ModePills />
      </div>
    </div>
  );
}
