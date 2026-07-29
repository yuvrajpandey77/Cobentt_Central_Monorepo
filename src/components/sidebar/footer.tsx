"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Settings, User as UserIcon, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  const { user } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 flex flex-col items-center gap-2 pb-2">
        <Link href="/settings/user" aria-label="Settings">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150"
          >
            <Settings className="w-3.5 h-3.5" />
          </motion.div>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 space-y-1.5 pb-2">
      <div className="px-2.5 relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 w-full h-[40px] px-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150 group"
        >
          <div className="w-6 h-6 rounded-full overflow-hidden bg-card/40 flex items-center justify-center flex-shrink-0">
            {user?.imageUrl ? (
              <Image src={user.imageUrl} alt="" width={24} height={24} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs font-medium truncate flex-1 text-left">
            {user?.fullName || user?.emailAddresses?.[0]?.emailAddress || "User"}
          </span>
          <ChevronUp className={cn("w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground transition-all duration-150", dropdownOpen && "rotate-180")} />
        </button>

        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-2 right-2 mb-1 bg-card/95 backdrop-blur-xl border border-border/30 rounded-lg py-1 shadow-xl z-50"
          >
            <Link
              href="/settings/user"
              onClick={() => setDropdownOpen(false)}
              className="block px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
            >
              Account
            </Link>
            <Link
              href="/overview/pricing"
              onClick={() => setDropdownOpen(false)}
              className="block px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-card/40 transition-colors"
            >
              Billing
            </Link>
            <div className="h-px bg-border/30 mx-2 my-1" />
            <SignOutButton>
              <button
                onClick={() => setDropdownOpen(false)}
                className="w-full text-left px-3 py-1.5 text-[11px] text-red-400 hover:bg-card/40 transition-colors"
              >
                Logout
              </button>
            </SignOutButton>
          </motion.div>
        )}
      </div>

      <div className="mx-2.5 flex items-center justify-start">
        <Link href="/settings/user" aria-label="Settings">
          <motion.div
            whileTap={{ scale: 0.9 }}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card/40 transition-all duration-150"
          >
            <Settings className="w-3 h-3" />
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
