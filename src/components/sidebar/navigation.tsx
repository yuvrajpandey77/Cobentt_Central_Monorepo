"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  Globe,
  BookOpen,
  Bot,
  ChevronDown,
  Presentation,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const visibleItems: NavItem[] = [
  { label: "Chats", href: "/chat", icon: <MessageCircle className="w-[15px] h-[15px]" /> },
  { label: "Projects", href: "/all-projects", icon: <FolderOpen className="w-[15px] h-[15px]" /> },
  { label: "Slides", href: "/slides", icon: <Presentation className="w-[15px] h-[15px]" /> },
  { label: "Documents", href: "/document", icon: <FileText className="w-[15px] h-[15px]" /> },
  { label: "Sheets", href: "/sheet", icon: <FileSpreadsheet className="w-[15px] h-[15px]" /> },
  { label: "Deep Research", href: "/deep-research", icon: <Search className="w-[15px] h-[15px]" /> },
  { label: "Websites", href: "/all-projects?type=website", icon: <Globe className="w-[15px] h-[15px]" /> },
];

const hiddenItems: NavItem[] = [
  { label: "Knowledge", href: "#", icon: <BookOpen className="w-[15px] h-[15px]" /> },
  { label: "Agents", href: "#", icon: <Bot className="w-[15px] h-[15px]" /> },
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
          "h-9 w-9 rounded-lg transition-all duration-150 flex items-center justify-center",
          isActive
            ? "bg-primary/20 text-primary border border-primary/30"
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
        "flex items-center gap-2.5 h-9 px-3 rounded-lg transition-all duration-150 group relative",
        isActive
          ? "bg-primary/20 text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-card/40"
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
      )}
      <span className={cn("transition-colors duration-150 shrink-0", isActive ? "text-primary" : "text-muted-foreground")}>{item.icon}</span>
      <span className="text-xs font-medium">{item.label}</span>
    </Link>
  );
}

export function SidebarNavigation({ isCollapsed }: SidebarNavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showMore, setShowMore] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.href === "#") return false;
    if (item.href.includes("?")) {
      const [base, qs] = item.href.split("?");
      if (!pathname.startsWith(base)) return false;
      const params = new URLSearchParams(qs);
      for (const [k, v] of params) {
        if (searchParams.get(k) !== v) return false;
      }
      return true;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <nav className={cn(
      "flex-shrink-0",
      isCollapsed ? "flex flex-col items-center gap-1 px-2" : "space-y-0.5 px-2"
    )}>
      {visibleItems.map((item) => (
        <motion.div
          key={item.label}
          whileHover={{ x: 2 }}
          transition={{ duration: 0.15 }}
        >
          <NavItemInner item={item} isActive={isActive(item)} isCollapsed={isCollapsed} />
        </motion.div>
      ))}

      {!isCollapsed && (
        <>
          <button
            onClick={() => setShowMore(!showMore)}
            className="flex items-center gap-2.5 h-9 w-full px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150"
          >
            <span className="text-muted-foreground">
              <ChevronDown className={cn("w-[15px] h-[15px] transition-transform duration-200", showMore && "rotate-180")} />
            </span>
            <span className="text-xs font-medium">More</span>
          </button>

          <AnimatePresence initial={false}>
            {showMore && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5 pt-0.5">
                  {hiddenItems.map((item) => (
                    <motion.div
                      key={item.label}
                      whileHover={{ x: 2 }}
                      transition={{ duration: 0.15 }}
                    >
                      <NavItemInner item={item} isActive={isActive(item)} isCollapsed={isCollapsed} />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {isCollapsed && (
        <>
          {hiddenItems.map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <NavItemInner item={item} isActive={isActive(item)} isCollapsed={isCollapsed} />
            </motion.div>
          ))}
        </>
      )}
    </nav>
  );
}
