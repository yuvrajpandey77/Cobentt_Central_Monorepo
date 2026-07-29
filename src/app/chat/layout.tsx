import { Suspense } from "react";
import { ThemeProvider } from "@/lib/theme-provider";
import { ChatProvider } from "@/lib/chat-store";
import { SidebarProvider } from "@/contexts/sidebar-context";

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="h-dvh flex items-center justify-center bg-[var(--color-cb-bg)]">
        <div className="w-5 h-5 border-2 border-[var(--color-cb-border-strong)] border-t-[var(--color-cb-text-muted)] rounded-full animate-spin" />
      </div>
    }>
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </Suspense>
  );
}
