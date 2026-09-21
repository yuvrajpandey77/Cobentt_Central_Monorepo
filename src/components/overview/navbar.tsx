"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser, SignOutButton } from "@clerk/nextjs";

const navLinks = [
  { label: "Features", href: "/overview/features" },
  { label: "Research", href: "/overview/research" },
  { label: "Developers", href: "/overview/developers" },
  { label: "Pricing", href: "/overview/pricing" },
];

export function Navbar() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled ? "bg-bg-primary/70 backdrop-blur-xl border-b border-border/30" : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 lg:h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.webp"
              alt="Cobentt"
              width={32}
              height={32}
              className="rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
              priority
            />
            <span className="text-base lg:text-lg font-bold tracking-tight text-text-primary">Cobentt</span>
          </Link>

          <div className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-2.5 py-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {isLoaded && isSignedIn ? (
              <>
                <Link
                  href="/"
                  className="text-xs font-medium text-black bg-white hover:bg-gray-100 px-4 py-1.5 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] transition-all duration-300"
                >
                  Open Workspace
                </Link>
                <SignOutButton>
                  <button className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
                    <span>{user?.fullName || user?.emailAddresses?.[0]?.emailAddress || "User"}</span>
                  </button>
                </SignOutButton>
              </>
            ) : (
              <>
                <Link href="/sign-in" className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                  Login
                </Link>
                <Link
                  href="/"
                  className="text-xs font-medium text-black bg-white hover:bg-gray-100 px-4 py-1.5 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] transition-all duration-300"
                >
                  Open Workspace
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-1.5 text-text-secondary hover:text-text-primary transition-colors"
            aria-label={mobileOpen ? "Close" : "Menu"}
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden border-t border-border/30 bg-bg-primary/95 backdrop-blur-xl overflow-hidden"
          >
            <div className="px-6 py-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <hr className="border-border/50 my-3" />
              {isLoaded && isSignedIn ? (
                <>
                  <Link
                    href="/"
                    className="block text-sm font-medium text-black bg-white px-4 py-2 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] text-center mt-2"
                  >
                    Open Workspace
                  </Link>
                  <SignOutButton>
                    <button className="block text-sm text-text-secondary hover:text-text-primary px-3 py-2 w-full text-left">
                      Sign Out ({user?.fullName || user?.emailAddresses?.[0]?.emailAddress || "User"})
                    </button>
                  </SignOutButton>
                </>
              ) : (
                <>
                  <Link href="/sign-in" className="block text-sm text-text-secondary hover:text-text-primary px-3 py-2">
                    Login
                  </Link>
                  <Link
                    href="/"
                    className="block text-sm font-medium text-black bg-white px-4 py-2 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] text-center mt-2"
                  >
                    Open Workspace
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
