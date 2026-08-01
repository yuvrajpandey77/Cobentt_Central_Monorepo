"use client";

import { Search } from "lucide-react";
import { ModeList } from "@/components/mode-list";

export default function DeepResearchPage() {
  return (
    <ModeList
      mode="deep-research"
      routePrefix="/deep-research"
      icon={<Search className="w-6 h-6" />}
      iconBg="bg-gradient-to-r from-violet-500/20 to-indigo-500/20"
      iconColor="text-violet-400"
      title="Your research"
      description="Create a new deep research from the home page, or open an existing one."
    />
  );
}
