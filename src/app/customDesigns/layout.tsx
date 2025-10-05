"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/sections/landing-sections";

interface CustomDesignsLayoutProps {
  children: React.ReactNode;
}

export default function CustomDesignsLayout({ children }: CustomDesignsLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
