"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { ChatList } from "@/components/chat-list";
import { cn } from "@/lib/utils";

function ChatsPageContent() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:block fixed left-0 top-0 h-screen z-50" />
      <div className={cn(
        "flex-1 transition-all duration-500 ease-in-out",
        isCollapsed ? "lg:ml-[52px]" : "lg:ml-[240px]"
      )}>
        <ChatList />
      </div>
    </div>
  );
}

export default function ChatsPage() {
  return (
    <SidebarProvider>
      <ChatsPageContent />
    </SidebarProvider>
  );
}
