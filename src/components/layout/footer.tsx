"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Github, Linkedin, Twitter } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-[var(--color-cb-bg)] text-[var(--color-text-primary)]">
      <div className="mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 py-16">
          {/* Logo Section */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4 group">
              <Image
                src="/cobentttransparent.webp"
                alt="Cobentt Labs"
                width={40}
                height={40}
                className="rounded-full group-hover:opacity-80 transition-opacity"
              />
              <span className="text-2xl font-bold">COBENTT</span>
            </Link>
            <p className="text-text-secondary text-sm max-w-xs mb-4">
              Building intelligent systems where AI and Web3 evolve together.
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/COBENTT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-[var(--color-text-strong)] transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://x.com/cobentt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-[var(--color-text-strong)] transition-colors duration-200"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/company/cobentt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-[var(--color-text-strong)] transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <p className="text-text-tertiary text-xs max-w-xs mt-5">
              by{' '}<a href="https://cogerphere.com" target="_blank" rel="noopener noreferrer" className="text-text-secondary hover:text-[var(--color-text-strong)] transition-colors">Cogerphere</a>{' '}AI Labs
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-4 text-text-code">Products</h3>
            <ul className="space-y-3 text-text-secondary">
              <li>
                <Link href="/" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Cobentt</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/dapp-studio" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Contract Builder</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/all-projects" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>My Projects</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/developers" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Developers</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/pricing" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Pricing</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-text-code">Resources</h3>
            <ul className="space-y-3 text-text-secondary">
              <li>
                <Link href="/docs" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Documentation</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/features" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Features</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/blog" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Blog</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/about" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Support</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Community</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-text-code">Company</h3>
            <ul className="space-y-3 text-text-secondary">
              <li>
                <Link href="/overview/about" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>About</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/research" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Research</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Careers</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/contact" className="hover:text-[var(--color-text-strong)] transition-colors duration-200 flex items-center gap-1 group">
                  <span>Contact</span>
                  <ChevronRight className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4 text-text-code">Legal</h3>
            <ul className="space-y-3 text-text-secondary">
              <li>
                <Link href="/overview/privacy" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/overview/terms" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/overview/ai-disclosure" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  AI Disclosure
                </Link>
              </li>
              <li>
                <Link href="/overview/licenses" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Licenses
                </Link>
              </li>
              <li>
                <Link href="/overview/account-deletion" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Account Deletion
                </Link>
              </li>
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h3 className="font-semibold mb-4 text-text-code">Connect</h3>
            <ul className="space-y-3 text-text-secondary">
              <li>
                <Link href="/overview/contact" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Contact us
                </Link>
              </li>
              <li>
                <a href="mailto:support@cogerphere.com" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  support@cogerphere.com
                </a>
              </li>
              <li>
                <Link href="/overview/contact?topic=integration" className="hover:text-[var(--color-text-strong)] transition-colors duration-200">
                  Industry integrations
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[var(--color-cb-border)] py-10 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-text-secondary">
            <p>&copy; {new Date().getFullYear()} Cogerphere AI Labs. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};
