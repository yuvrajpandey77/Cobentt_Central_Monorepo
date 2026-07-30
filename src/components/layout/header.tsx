"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { UserControl } from "@/components/user-control";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "sticky top-0 z-30 w-full transition-all duration-300",
      isScrolled
        ? "bg-white/20 dark:bg-black/20 backdrop-blur-md border-b border-white/20"
        : "bg-transparent backdrop-blur-sm"
    )}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-2" />

          <div className="hidden md:flex items-center space-x-4">
            <SignedOut>
              <div className="flex items-center gap-3">
                <Link href="/sign-in">
                  <Button variant="ghost" size="default" className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20 h-9 px-6">
                    Sign in
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button className="bg-white text-black hover:bg-gray-100 font-semibold shadow-lg border-none h-9 px-6">
                    Sign up
                  </Button>
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3">
                <UserControl showName={true} />
              </div>
            </SignedIn>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-white/20 hover:text-black"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-3 pt-4 w-full">
                <SignedOut>
                  <div className="flex flex-col gap-3 w-full">
                    <Link href="/sign-in" className="w-full">
                      <Button variant="ghost" size="default" className="text-white/80 hover:text-white hover:bg-white/10 w-full justify-start border border-white/20 h-9">
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/sign-up" className="w-full">
                      <Button className="bg-white text-black hover:bg-gray-100 font-semibold w-full border-none h-9">
                        Sign up
                      </Button>
                    </Link>
                  </div>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <UserControl showName={true} />
                  </div>
                </SignedIn>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
