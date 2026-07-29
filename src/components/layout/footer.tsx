"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Github, Linkedin, Twitter } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-black text-white">
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
            <p className="text-gray-400 text-sm max-w-xs mb-4">
              Building intelligent systems where AI and Web3 evolve together.
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="https://github.com/COBENTT" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Github className="w-5 h-5" />
              </a>
              <a 
                href="https://x.com/cobentt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/company/cobentt" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <p className="text-gray-500 text-xs max-w-xs mt-5">
              by{' '}<a href="https://cogerphere.vercel.app" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">Cogerphere</a>{' '}AI Labs
            </p>
          </div>

          {/* Products */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-300">Products</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Cobentt</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/dapp-studio" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Contract Builder</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/all-projects" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">My Projects</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/pricing" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Pricing</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-300">Resources</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/docs" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Documentation</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/features" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Features</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/about" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Support</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/community" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Community</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4 text-gray-300">Company</h3>
            <ul className="space-y-3 text-gray-400">
              <li>
                <Link href="/overview/about" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">About</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/research" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Research</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Careers</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
              <li>
                <Link href="/overview/about" className="hover:text-white transition-colors duration-200 flex items-center group">
                  <span className="group-hover:translate-x-1 transition-transform duration-200">Contact</span>
                  <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 py-10 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Cogerphere AI Labs. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/overview/privacy" className="hover:text-white transition-colors duration-200">
                Privacy Policy
              </Link>
              <Link href="/overview/terms" className="hover:text-white transition-colors duration-200">
                Terms of Service
              </Link>
              <Link href="/overview/ai-disclosure" className="hover:text-white transition-colors duration-200">
                AI Disclosure
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
