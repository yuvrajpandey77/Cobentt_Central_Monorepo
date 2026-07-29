import type { Metadata } from "next";
import {
  MessageSquare,
  BrainCircuit,
  Search,
  Code2,
  Bot,
  FileText,
  FolderKanban,
  Palette,
  Image,
  Globe,
  Mic,
  Puzzle,
  Library,
  Database,
  Cpu,
  Shield,
  Route,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features",
  description: "Everything Cobentt offers — from multi-model chat to AI agents, research tools, and developer workspace.",
};

const featureGroups = [
  {
    title: "Core Workspace",
    items: [
      { icon: MessageSquare, name: "Multi-Model Chat", desc: "Chat with any AI model from a single interface. Compare responses side by side. Switch models mid-conversation without losing context." },
      { icon: FolderKanban, name: "Projects", desc: "Organize everything into projects with folders, tags, and version history. Every chat, document, and research source belongs to a project." },
      { icon: FileText, name: "Rich Documents", desc: "Write, edit, and publish documents with AI collaboration. Live Markdown preview, export to PDF, DOCX, and LaTeX." },
      { icon: BrainCircuit, name: "Context Engine", desc: "Meridian maintains a persistent knowledge graph across all your projects, chats, documents, and research. Context never resets." },
    ],
  },
  {
    title: "Intelligence Layer",
    items: [
      { icon: Cpu, name: "Meridian Orchestration", desc: "Purpose-built SLM that plans, routes, retrieves context, selects models, and verifies every response before you see it." },
      { icon: Route, name: "Model Router", desc: "Routes each request to the optimal model based on task complexity, capability requirements, cost, and latency." },
      { icon: Shield, name: "Safety Layer", desc: "Built-in content filtering, prompt injection detection, output validation, and data privacy controls." },
      { icon: BrainCircuit, name: "Persistent Memory", desc: "Remembers your preferences, project history, and research context across sessions. Everything stays connected." },
    ],
  },
  {
    title: "Research Tools",
    items: [
      { icon: Search, name: "Deep Research", desc: "Multi-source research with PDF understanding, citation generation, source tracking, and knowledge synthesis." },
      { icon: Globe, name: "Web Browser", desc: "Built-in browser for research, testing, and web automation. AI can browse, extract, and analyze web content." },
      { icon: Library, name: "Knowledge Base", desc: "Upload documents, PDFs, and notes to build a personal knowledge base. Search across all sources instantly." },
      { icon: Database, name: "Reference Manager", desc: "Auto-capture citations, manage references, and export in any format. Supports APA, MLA, Chicago, and more." },
    ],
  },
  {
    title: "Developer Tools",
    items: [
      { icon: Code2, name: "Code Workspace", desc: "Built-in code editor with syntax highlighting, AI pair programming, and multi-file context understanding." },
      { icon: Bot, name: "AI Agents", desc: "Deploy autonomous agents that plan, reason, call tools, write code, and execute complex multi-step tasks." },
      { icon: Palette, name: "Canvas", desc: "Visual canvas for system design, architecture diagrams, brainstorming, and flowcharts." },
      { icon: Image, name: "Image Generation", desc: "Generate and edit images with DALL-E, Stable Diffusion, Flux, and more. All from within the workspace." },
    ],
  },
  {
    title: "Platform",
    items: [
      { icon: Mic, name: "Voice", desc: "Voice input and output for hands-free interaction. Works with all supported models." },
      { icon: Puzzle, name: "Extensions", desc: "Extend Cobentt with plugins, custom tools, and third-party integrations via the extension API." },
      { icon: Globe, name: "Local Models", desc: "Run models locally with Ollama. Full support for local inference without cloud dependency." },
      { icon: Shield, name: "Privacy First", desc: "Local-first architecture. Your API keys. No training on your data. End-to-end encryption." },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Features
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything Cobentt offers.{" "}
            <span className="text-white">Nothing more.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            A complete AI workspace with no feature bloat. Every tool has a purpose.
          </p>
        </div>

        {featureGroups.map((group) => (
          <div key={group.title} className="mb-16 lg:mb-20">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-8">{group.title}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {group.items.map((item) => (
                <div
                  key={item.name}
                  className="p-5 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] hover:border-white/20 transition-colors"
                >
                  <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                    <item.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{item.name}</h3>
                  <p className="text-xs text-white/40 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}