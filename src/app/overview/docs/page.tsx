"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Sparkles,
  Clipboard,
  Check,
  BookOpen,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Outline items
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "prerequisites", label: "Prerequisites" },
  { id: "install-package", label: "Install the package" },
  { id: "configure-theming", label: "Configure theming" },
  { id: "next-steps", label: "Next steps" },
];

const AI_PROMPT =
  "Help me get set up with Product Name. Based on my project, do the following: 1. Install @astryxdesign/core and the StyleX compiler. 2. Wrap my app in ThemeProvider. 3. Replace one existing component with an Astryx equivalent. After setup, suggest relevant next steps based on my project.";

// ---------------------------------------------------------------------------
// Simple code block
// ---------------------------------------------------------------------------

function CodeSnippet({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [code]);

  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border border-white/10 border-b-0 rounded-tl-[8px] rounded-tr-[8px]">
        <span className="text-[11px] font-medium text-text-tertiary font-mono uppercase tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-secondary transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Clipboard className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 bg-black/40 border border-white/10 rounded-bl-[8px] rounded-br-[8px] overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed text-white/80">
          {code}
        </code>
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider
// ---------------------------------------------------------------------------

function SectionDivider() {
  return <div className="border-t border-white/5" />;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function TechnicalDocumentationPage() {
  const [activeId, setActiveId] = useState(SECTIONS[0]?.id ?? "");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const scrollToId = useCallback((id: string) => {
    setActiveId(id);
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `#${id}`);
    }
  }, []);

  // Track active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveId(SECTIONS[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <main className="pt-24 lg:pt-28">
      {/* ── Hero ── */}
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-12 lg:mb-16 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            <BookOpen className="w-3 h-3" />
            Documentation
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Getting started with{" "}
            <span className="text-white">Product Name</span>
          </h1>
          <p className="mt-3 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Last updated March 30, 2026
          </p>
        </div>
      </div>

      {/* ── Content + Sidebar ── */}
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 pb-20 lg:pb-28">
        <div className="flex gap-10">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 max-w-[760px]">
            <div className="flex flex-col gap-8">
              {/* AI Assistance Card */}
              <div className="p-5 bg-bg-card border border-white/10 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px]">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-semibold text-white/80">
                        AI Assistance
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          navigator.clipboard.writeText(AI_PROMPT)
                        }
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-text-tertiary hover:text-white/80 transition-colors rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] hover:bg-white/5"
                      >
                        <Clipboard className="w-3.5 h-3.5" />
                        Copy prompt
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-text-tertiary leading-relaxed">
                    {AI_PROMPT}
                  </p>
                </div>
              </div>

              {/* Prerequisites */}
              <section id="prerequisites">
                <h2 className="text-xl font-bold text-white mb-4">
                  Prerequisites
                </h2>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    Node.js 18+
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    React 18 or 19
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    A package manager (npm, yarn, or pnpm)
                  </li>
                </ul>
              </section>

              <SectionDivider />

              {/* Install the package */}
              <section id="install-package">
                <h2 className="text-xl font-bold text-white mb-3">
                  Install the package
                </h2>
                <p className="text-sm text-text-tertiary mb-4 leading-relaxed">
                  Every project starts with installing the core package. This
                  gives you access to all components, tokens, and utilities.
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-text-secondary mb-2">
                      Step 1: Install the core package
                    </p>
                    <CodeSnippet
                      code="npm install @astryxdesign/core"
                      language="bash"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-text-secondary mb-2">
                      Step 2: Import the precompiled styles
                    </p>
                    <p className="text-sm text-text-tertiary mb-2 leading-relaxed">
                      Astryx ships precompiled CSS, so there is no build plugin
                      to configure. Import the reset and component stylesheets
                      once at your app entry point.
                    </p>
                    <CodeSnippet
                      code={`import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';`}
                      language="tsx"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-text-secondary mb-2">
                      Step 3: Import your first component
                    </p>
                    <CodeSnippet
                      code={`import { Button } from '@astryxdesign/core/Button';

export default function App() {
  return <Button label="Hello Astryx" variant="primary" />;
}`}
                      language="tsx"
                    />
                  </div>
                </div>
              </section>

              <SectionDivider />

              {/* Configure theming */}
              <section id="configure-theming">
                <h2 className="text-xl font-bold text-white mb-3">
                  Configure theming
                </h2>
                <p className="text-sm text-text-tertiary mb-4 leading-relaxed">
                  Astryx ships with a default theme that works out of the box.
                  To customize colors, typography, and spacing, wrap your app in
                  a theme provider.
                </p>
                <CodeSnippet
                  code={`import { ThemeProvider } from '@astryxdesign/core/Theme';

export default function App({ children }) {
  return (
    <ThemeProvider theme="default">
      {children}
    </ThemeProvider>
  );
}`}
                  language="tsx"
                />
                <p className="text-sm text-text-tertiary mt-3 leading-relaxed">
                  See the theming guide for the full list of customizable
                  tokens.
                </p>
              </section>

              <SectionDivider />

              {/* Next steps */}
              <section id="next-steps">
                <h2 className="text-xl font-bold text-white mb-4">
                  Next steps
                </h2>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    Fundamental concepts — How theming, layout, and composition
                    work
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    Component API reference — Props, variants, and examples for
                    every component
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    Accessibility — Built-in a11y features and ARIA patterns
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    CLI tools — Scaffold projects and manage templates
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
                    Design tokens — Colors, spacing, typography, and sizing
                  </li>
                </ul>
              </section>
            </div>
          </div>

          {/* ── Desktop outline sidebar ── */}
          {!isMobile && (
            <aside className="w-56 shrink-0" style={{ position: "sticky", top: 120, alignSelf: "start" }}>
              <nav role="complementary" aria-label="On this page">
                <h3 className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">
                  On this page
                </h3>
                <ul className="flex flex-col gap-1">
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <button
                        onClick={() => scrollToId(section.id)}
                        className={`text-left text-sm w-full px-3 py-1.5 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] transition-colors ${
                          activeId === section.id
                            ? "bg-white/10 text-white font-medium"
                            : "text-text-tertiary hover:text-text-secondary hover:bg-white/5"
                        }`}
                      >
                        {section.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>
          )}
        </div>

        {/* ── Mobile outline selector ── */}
        {isMobile && (
          <div className="mt-6">
            <select
              value={activeId}
              onChange={(e) => scrollToId(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-bg-card border border-white/10 text-text-secondary rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] appearance-none cursor-pointer"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "14px",
              }}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </main>
  );
}
