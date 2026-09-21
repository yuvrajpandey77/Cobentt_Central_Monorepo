"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Bot,
  Code2,
  Globe,
  Shield,
  Workflow,
  Network,
  FileText,
  Search,
  MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/overview/navbar";
import { Footer } from "@/components/layout/footer";

const SECTIONS = [
  { id: "what-is-cobentt", label: "What is Cobentt?" },
  { id: "key-features", label: "Key Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "getting-started", label: "Getting Started" },
  { id: "use-cases", label: "Use Cases" },
  { id: "faq", label: "FAQ" },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Chat & Workspace",
    desc: "Conversational interface powered by multiple AI models. Chat, iterate, and refine your ideas in real time with context-aware assistance.",
  },
  {
    icon: Code2,
    title: "Smart Contract Builder",
    desc: "Design, deploy, and verify smart contracts across multiple blockchains. No deep Solidity knowledge required — describe what you want and let AI handle the rest.",
  },
  {
    icon: Globe,
    title: "Web App Generator",
    desc: "Generate full-stack web applications from natural language prompts. React, TypeScript, Node.js — production-ready code in minutes.",
  },
  {
    icon: Search,
    title: "Deep Research",
    desc: "Conduct comprehensive research across web sources, academic papers, and documents. AI synthesizes findings into structured reports with citations.",
  },
  {
    icon: FileText,
    title: "Document & Knowledge Management",
    desc: "Upload, organize, and query documents. The context engine retrieves relevant information across your entire knowledge base instantly.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Local-first architecture, end-to-end encryption, and granular access controls. Your data stays yours — we never train on your content.",
  },
  {
    icon: Workflow,
    title: "Agent Orchestration",
    desc: "Deploy autonomous AI agents that plan, reason, call tools, and execute complex multi-step tasks across your workflow.",
  },
  {
    icon: Network,
    title: "Multi-Model Platform",
    desc: "Access GPT-4, Claude, Gemini, Llama, and more from a single interface. Meridian routes each task to the optimal model automatically.",
  },
];

function SectionDivider() {
  return <div className="border-t border-white/5" />;
}

function DocsContent() {
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
    <div className="pt-14 lg:pt-16">
      <Navbar />

      {/* ── Content + Sidebar ── */}
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10 pt-12 pb-20 lg:pb-28">
        <div className="flex gap-10">
          {/* ── Main content ── */}
          <div className="flex-1 min-w-0 max-w-[760px]">
            <div className="flex flex-col gap-10">

              {/* What is Cobentt? */}
              <section id="what-is-cobentt">
                <h2 className="text-xl font-bold text-white mb-4">What is Cobentt?</h2>
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  Cobentt is an integrated AI workspace that combines conversational intelligence,
                  smart contract development, web application generation, deep research, and
                  document management into a single, unified platform.
                </p>
                <p className="text-sm text-white/50 leading-relaxed mb-4">
                  Unlike single-purpose AI tools, Cobentt gives you access to multiple leading AI
                  models — GPT-4, Claude, Gemini, Llama, and more — through a single interface.
                  Our proprietary Meridian orchestration layer intelligently routes each task to
                  the optimal model, ensuring you always get the best results.
                </p>
                <p className="text-sm text-white/50 leading-relaxed">
                  Whether you are a developer shipping smart contracts, a researcher synthesizing
                  papers, or a creator bringing ideas to life, Cobentt adapts to your workflow
                  — not the other way around.
                </p>
              </section>

              <SectionDivider />

              {/* Key Features */}
              <section id="key-features">
                <h2 className="text-xl font-bold text-white mb-6">Key Features</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {FEATURES.map((f) => (
                    <div
                      key={f.title}
                      className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]"
                    >
                      <div className="w-8 h-8 rounded-tr-[5px] rounded-bl-[5px] rounded-tl-[3px] rounded-br-[3px] bg-white/10 flex items-center justify-center mb-3">
                        <f.icon className="w-4 h-4 text-white/70" />
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
                      <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              <SectionDivider />

              {/* How It Works */}
              <section id="how-it-works">
                <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>

                <div className="flex flex-col gap-5">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white/70">1</span>
                      </div>
                      <div className="w-px flex-1 bg-white/10 mt-2" />
                    </div>
                    <div className="pb-5">
                      <h3 className="text-sm font-semibold text-white mb-1">Choose your task</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        Describe what you want to build, research, or create in natural language.
                        Cobentt understands intent across chat, code, contracts, documents, and research.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white/70">2</span>
                      </div>
                      <div className="w-px flex-1 bg-white/10 mt-2" />
                    </div>
                    <div className="pb-5">
                      <h3 className="text-sm font-semibold text-white mb-1">Meridian routes intelligently</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        Our Meridian orchestration layer analyzes your request, retrieves relevant
                        context, plans the execution strategy, and selects the best AI model for the job.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white/70">3</span>
                      </div>
                      <div className="w-px flex-1 bg-white/10 mt-2" />
                    </div>
                    <div className="pb-5">
                      <h3 className="text-sm font-semibold text-white mb-1">AI executes and iterates</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        The selected model executes your task — generating code, analyzing data,
                        writing content, or deploying contracts. You can iterate, refine, and
                        steer results in real time.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white/70">4</span>
                      </div>
                      <div className="w-px flex-1 bg-white/10" />
                    </div>
                    <div className="pb-5">
                      <h3 className="text-sm font-semibold text-white mb-1">Deploy and share</h3>
                      <p className="text-sm text-white/40 leading-relaxed">
                        Once ready, deploy your smart contracts, publish web apps, or export
                        research reports — all from within the Cobentt workspace.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <SectionDivider />

              {/* Getting Started */}
              <section id="getting-started">
                <h2 className="text-xl font-bold text-white mb-4">Getting Started</h2>
                <p className="text-sm text-white/50 mb-4 leading-relaxed">
                  Getting started with Cobentt is straightforward. Here is how to begin:
                </p>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white/70 mb-2">Step 1: Create an account</p>
                    <p className="text-sm text-white/40 mb-2 leading-relaxed">
                      Sign up at cobentt.com with your email or GitHub account. No credit card
                      required for the free tier.
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/70 mb-2">Step 2: Start a conversation</p>
                    <p className="text-sm text-white/40 mb-2 leading-relaxed">
                      Open the chat workspace and describe what you want to build or explore.
                      Cobentt will guide you through the process.
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/70 mb-2">Step 3: Choose your path</p>
                    <p className="text-sm text-white/40 mb-2 leading-relaxed">
                      Select a project type — web app, smart contract, research, document, or slide
                      deck — and Cobentt tailors the experience accordingly.
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white/70 mb-2">Step 4: Build and deploy</p>
                    <p className="text-sm text-white/40 leading-relaxed">
                      Iterate with AI assistance until you are happy with the result, then deploy
                      directly from the platform.
                    </p>
                  </div>
                </div>
              </section>

              <SectionDivider />

              {/* Use Cases */}
              <section id="use-cases">
                <h2 className="text-xl font-bold text-white mb-4">Use Cases</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
                    <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Bot className="w-4 h-4 text-white/50" />
                      Smart Contract Development
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Describe your contract logic in plain English. Cobentt generates Solidity code,
                      tests it, and helps you deploy to Ethereum, Polygon, or any EVM-compatible chain.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
                    <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-white/50" />
                      Web Application Development
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Generate full-stack web applications from natural language descriptions.
                      React, Next.js, TypeScript, and Node.js — complete with authentication,
                      databases, and deployment.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
                    <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <Search className="w-4 h-4 text-white/50" />
                      Research & Analysis
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Conduct deep research across web sources and academic databases. AI synthesizes
                      findings into structured reports with citations and summaries.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px]">
                    <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white/50" />
                      Document Management
                    </h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Upload documents, query them with natural language, and let AI extract
                      insights, summarize content, and connect information across your knowledge base.
                    </p>
                  </div>
                </div>
              </section>

              <SectionDivider />

              {/* FAQ */}
              <section id="faq">
                <h2 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                    <h3 className="text-sm font-semibold text-white mb-1">What AI models does Cobentt support?</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Cobentt supports GPT-4, GPT-4o, Claude 3.5 Sonnet, Opus, Gemini Pro, Gemini Ultra,
                      Llama 3, Mistral, and open-weight models via Ollama. Meridian routes each task to
                      the best model automatically.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                    <h3 className="text-sm font-semibold text-white mb-1">Is my data private?</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Yes. Cobentt uses a local-first architecture with end-to-end encryption. We never
                      train on your data. You control what is stored and shared.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                    <h3 className="text-sm font-semibold text-white mb-1">Do I need coding experience?</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Not at all. Cobentt is designed for both developers and non-developers. Describe
                      what you want in natural language and AI handles the implementation.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                    <h3 className="text-sm font-semibold text-white mb-1">What blockchains do you support?</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Cobentt supports Ethereum, Polygon, Arbitrum, Optimism, Base, and other
                      EVM-compatible chains for smart contract deployment.
                    </p>
                  </div>

                  <div className="p-4 bg-white/[0.03] border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px]">
                    <h3 className="text-sm font-semibold text-white mb-1">Is there a free tier?</h3>
                    <p className="text-xs text-white/40 leading-relaxed">
                      Yes. Cobentt offers a free tier with generous usage limits. Upgrade to a paid
                      plan for higher quotas, priority models, and team features.
                    </p>
                  </div>
                </div>
              </section>

            </div>
          </div>

          {/* ── Desktop outline sidebar ── */}
          {!isMobile && (
            <aside className="w-56 shrink-0" style={{ position: "sticky", top: 100, alignSelf: "start" }}>
              <nav role="complementary" aria-label="On this page">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
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
                            : "text-white/40 hover:text-white/70 hover:bg-white/5"
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
              className="w-full px-3 py-2.5 text-sm bg-white/5 border border-white/10 text-white/70 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] appearance-none cursor-pointer"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 12px center",
                backgroundSize: "14px",
              }}
            >
              {SECTIONS.map((section) => (
                <option key={section.id} value={section.id}>{section.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function DocsPage() {
  return <DocsContent />;
}
