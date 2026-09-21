"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/overview/features" },
      { label: "Research", href: "/overview/research" },
      { label: "Developers", href: "/overview/developers" },
      { label: "Pricing", href: "/overview/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "/overview/docs" },
      { label: "Blog", href: "/overview/blog" },
      { label: "About", href: "/overview/about" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/overview/privacy" },
      { label: "Terms of Service", href: "/overview/terms" },
      { label: "AI Disclosure", href: "/overview/ai-disclosure" },
      { label: "Licenses", href: "/overview/licenses" },
      { label: "Account Deletion", href: "/overview/account-deletion" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact", href: "/overview/contact" },
      { label: "Share feedback", href: "/overview/contact?topic=feedback" },
      { label: "Industry integrations", href: "/overview/contact?topic=integration" },
      { label: "support@cogerphere.com", href: "mailto:support@cogerphere.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-secondary/50">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 group mb-4">
              <Image
                src="/logo.webp"
                alt="Cobentt"
                width={44}
                height={44}
                className="rounded-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="text-xl font-bold tracking-tight">Cobentt</span>
            </Link>
            <p className="text-sm text-text-secondary leading-relaxed max-w-xs mb-6">
              The AI workspace where ideas become execution.
            </p>
          </div>

          {footerLinks.map((group) => (
            <div key={group.title}>
              <h4 className="text-sm font-semibold text-text-primary mb-4">{group.title}</h4>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-secondary">
            &copy; {new Date().getFullYear()} Cobentt. All rights reserved.
          </p>
          <p className="text-xs text-text-secondary flex items-center gap-1">
            Made with <Heart className="w-3 h-3 text-danger" /> by the Cobentt team
          </p>
        </div>
      </div>
    </footer>
  );
}
