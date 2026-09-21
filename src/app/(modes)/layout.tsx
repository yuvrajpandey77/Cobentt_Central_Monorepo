"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ModeProvider } from "@/contexts/mode-context";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";
import { ByokGate } from "@/components/byok-gate";

function ModesLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isCollapsed } = useSidebar();

  const segments = pathname.split("/").filter(Boolean);
  const isEmpty = segments.length <= 1;

  const canvasModes = ["slides", "document", "sheet", "deep-research"];
  const isCanvas = !isEmpty && segments.length === 2 && canvasModes.includes(segments[0]);

  return (
    <div className={cn("flex", isCanvas ? "h-dvh overflow-hidden" : "min-h-screen")}>
      <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-500 ease-in-out min-w-0",
        isCollapsed ? "lg:ml-[52px]" : "lg:ml-[240px]",
        isCanvas && "min-h-0 overflow-hidden"
      )}>
        <div className={cn(
          "flex-1 flex flex-col min-h-0",
          isEmpty && "justify-center",
          isCanvas && "overflow-hidden"
        )}>
          <div className={cn(
            isCanvas
              ? "flex-1 min-h-0 overflow-hidden"
              : isEmpty ? "" : "flex-1 overflow-y-auto thin-scrollbar"
          )}>
            <ByokGate>{children}</ByokGate>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ModesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModeProvider>
      <SidebarProvider>
        <ModesLayoutInner>{children}</ModesLayoutInner>
      </SidebarProvider>
    </ModeProvider>
  );
}
