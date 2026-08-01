"use client";

import { FileSpreadsheet } from "lucide-react";
import { ModeList } from "@/components/mode-list";

export default function SheetPage() {
  return (
    <ModeList
      mode="sheet"
      routePrefix="/sheet"
      icon={<FileSpreadsheet className="w-6 h-6" />}
      iconBg="bg-gradient-to-r from-emerald-500/20 to-green-500/20"
      iconColor="text-emerald-400"
      title="Your spreadsheets"
      description="Create a new spreadsheet from the home page, or open an existing one."
    />
  );
}
