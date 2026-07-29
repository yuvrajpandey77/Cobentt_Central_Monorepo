"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  MessageCircle,
  FolderOpen,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Bot,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Chats", href: "/chat", icon: <MessageCircle className="w-4 h-4" /> },
  { label: "Projects", href: "/all-projects", icon: <FolderOpen className="w-4 h-4" /> },
  { label: "Sheets", href: "#", icon: <FileSpreadsheet className="w-4 h-4" /> },
  { label: "Website", href: "#", icon: <Globe className="w-4 h-4" /> },
  { label: "Knowledge", href: "#", icon: <BookOpen className="w-4 h-4" /> },
  { label: "Agents", href: "#", icon: <Bot className="w-4 h-4" /> },
  { label: "Files", href: "#", icon: <FileText className="w-4 h-4" /> },
];

interface SidebarNavigationProps {
  isCollapsed: boolean;
}

function NavItemInner({ item, isActive, isCollapsed }: { item: NavItem; isActive: boolean; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <Link
        href={item.href}
        className={cn(
          "h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center",
          isActive
            ? "bg-primary/20 border border-primary/30 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent hover:border-border/20"
        )}
        aria-label={item.label}
      >
        {item.icon}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 h-[42px] px-3 rounded-lg transition-all duration-200 group",
        isActive
          ? "bg-primary/20 border border-primary/30 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent hover:border-border/20"
      )}
    >
      <span className={cn("transition-colors duration-200", isActive && "text-primary")}>{item.icon}</span>
      <span className="text-sm font-medium">{item.label}</span>
    </Link>
  );
}

export function SidebarNavigation({ isCollapsed }: SidebarNavigationProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex-shrink-0", isCollapsed ? "flex flex-col items-center gap-1" : "space-y-0.5")}>
      {navItems.map((item) => {
        const isActive = item.href !== "#" && pathname.startsWith(item.href);
        return (
          <motion.div
            key={item.label}
            whileHover={{ x: 2 }}
            transition={{ duration: 0.15 }}
          >
            <NavItemInner item={item} isActive={isActive} isCollapsed={isCollapsed} />
          </motion.div>
        );
      })}
    </nav>
  );
}
