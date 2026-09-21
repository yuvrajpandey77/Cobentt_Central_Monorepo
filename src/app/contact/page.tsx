import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ContactPageContent } from "@/components/contact/contact-page-content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Cobentt — support for issues and queries, product feedback, and industry-level integrations. Email support@cogerphere.com.",
  alternates: { canonical: "/overview/contact" },
};

function MinimalNav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-bg-primary/70 backdrop-blur-xl border-b border-border/30">
      <nav className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 lg:h-16">
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/logo.webp"
              alt="Cobentt"
              width={32}
              height={32}
              className="rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="text-base lg:text-lg font-bold tracking-tight text-text-primary">
              Cobentt
            </span>
          </Link>
          <Link
            href="/overview/contact"
            className="text-xs font-medium text-black bg-white hover:bg-gray-100 px-4 py-1.5 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] transition-all duration-300"
          >
            Contact
          </Link>
        </div>
      </nav>
    </header>
  );
}

/**
 * Top-level /contact alias (canonical page lives at /overview/contact).
 * Kept as a real page instead of a redirect so links, QR codes and
 * old bookmarks keep working without a redirect hop.
 */
export default function ContactPage() {
  return (
    <div className="overview-wrapper min-h-screen bg-bg-primary text-text-primary antialiased">
      <MinimalNav />
      <Suspense>
        <ContactPageContent />
      </Suspense>
    </div>
  );
}
