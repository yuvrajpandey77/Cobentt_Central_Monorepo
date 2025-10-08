"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { UserControl } from "@/components/user-control";
import { Menu, X, Sparkles } from "lucide-react";
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
      "sticky top-0 z-50 w-full transition-all duration-300",
      isScrolled 
        ? "bg-white/20 dark:bg-black/20 backdrop-blur-md border-b border-white/20" 
        : "bg-transparent backdrop-blur-sm"
    )}>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/cogerpherelogoonly.jpg"
                alt="Cogerphere AI"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold text-white drop-shadow-lg">
                Cogerphere
              </span>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
            <Link
              href="/customDesigns/features"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors drop-shadow-md"
            >
              Features
            </Link>
            <Link
              href="/customDesigns/pricing"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors drop-shadow-md"
            >
              Pricing
            </Link>
            <Link
              href="#docs"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors drop-shadow-md"
            >
              Docs
            </Link>
            <Link
              href="/customDesigns/support"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors drop-shadow-md"
            >
              Support
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center space-x-4">
            <SignedOut>
              <div className="flex items-center gap-2">
                <Button asChild variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                  <Link href="/sign-up">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sign up
                  </Link>
                </Button>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-3">
                <UserControl showName={true} />
              </div>
            </SignedIn>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-4">
              <Link
                href="/customDesigns/features"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Features
              </Link>
              <Link
                href="/customDesigns/pricing"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="#docs"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Docs
              </Link>
              <Link
                href="/customDesigns/support"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                Support
              </Link>
              <div className="flex items-center space-x-4 pt-4">
                <SignedOut>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="secondary" size="sm" className="bg-white/10 text-white hover:bg-white/20">
                      <Link href="/sign-in">Sign in</Link>
                    </Button>
                    <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
                      <Link href="/sign-up">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Sign up
                      </Link>
                    </Button>
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
