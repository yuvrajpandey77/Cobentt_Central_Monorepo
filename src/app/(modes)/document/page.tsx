"use client";

import { FileText } from "lucide-react";
import { ModeList } from "@/components/mode-list";

export default function DocsPage() {
  return (
    <ModeList
      mode="document"
      routePrefix="/document"
      icon={<FileText className="w-6 h-6" />}
      iconBg="bg-gradient-to-r from-amber-500/20 to-yellow-500/20"
      iconColor="text-amber-400"
      title="Your documents"
      description="Create a new document from the home page, or open an existing one."
    />
  );
}
