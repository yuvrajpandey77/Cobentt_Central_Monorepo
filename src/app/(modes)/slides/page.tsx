"use client";

import { Presentation } from "lucide-react";
import { ModeList } from "@/components/mode-list";

export default function SlidesPage() {
  return (
    <ModeList
      mode="slides"
      routePrefix="/slides"
      icon={<Presentation className="w-6 h-6" />}
      iconBg="bg-gradient-to-r from-purple-500/20 to-pink-500/20"
      iconColor="text-purple-400"
      title="Your presentations"
      description="Create a new presentation from the home page, or open an existing one."
    />
  );
}
