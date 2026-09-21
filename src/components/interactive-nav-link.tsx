"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  children: React.ReactNode;
  className?: string;
  activeClassName?: string;
}

export default function InteractiveNavLink({ href, children, className, activeClassName }: Props) {
  const [pending, setPending] = useState(false);
  const pathname = usePathname();

  const isActive = pathname === href || (href !== "/" && pathname?.startsWith(href));

  useEffect(() => {
    // whenever route changes, clear pending state
    if (pending) {
      setPending(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("routeProgress:done"));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Link
      href={href}
      prefetch
      onClick={(e) => {
        // allow cmd/ctrl click to open in new tab/window without toggling
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        setPending(true);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("routeProgress:start"));
        }
      }}
      className={cn(
        "relative inline-flex items-center gap-1",
        "text-sm font-medium text-white/80 hover:text-white transition-colors",
        isActive && (activeClassName || "text-white"),
        className
      )}
    >
      {children}
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />}
    </Link>
  );
}


