import type { Metadata } from "next";
import { BookOpen, FileCode, Terminal, Puzzle, ExternalLink, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation",
  description: "Guides, API references, SDK docs, and integration tutorials for Cobentt.",
};

const sections = [
  {
    icon: BookOpen,
    title: "Getting Started",
    desc: "Learn the basics of Cobentt — projects, chats, documents, and the Meridian orchestration layer.",
    links: ["Quickstart Guide", "Workspace Overview", "Meridian Explained"],
  },
  {
    icon: FileCode,
    title: "API Reference",
    desc: "Complete REST API documentation for chat, documents, projects, agents, and management.",
    links: ["Authentication", "Chat Endpoints", "Project Management", "Agent API"],
  },
  {
    icon: Terminal,
    title: "CLI & SDK",
    desc: "Command-line tools and TypeScript SDK for integrating Cobentt into your workflows.",
    links: ["CLI Installation", "TypeScript SDK", "Python SDK", "Environment Variables"],
  },
  {
    icon: Puzzle,
    title: "Integrations",
    desc: "Connect Cobentt with your favorite tools — VS Code, GitHub, Slack, and more.",
    links: ["VS Code Extension", "GitHub Sync", "Custom Extensions", "Webhooks"],
  },
];

export default function DocsPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            <BookOpen className="w-3 h-3" />
            Documentation
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything you need to{" "}
            <span className="text-white">build.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            Guides, references, and tutorials to help you get the most out of Cobentt.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto mb-20 lg:mb-28">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-6 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] hover:border-white/10 transition-colors"
            >
              <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                <section.icon className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-base font-semibold text-white mb-1">{section.title}</h2>
              <p className="text-xs text-white/40 mb-4 leading-relaxed">{section.desc}</p>
              <ul className="space-y-1.5">
                {section.links.map((link) => (
                  <li key={link} className="flex items-center gap-1.5 text-xs text-white/30">
                    <ArrowRight className="w-2.5 h-2.5" />
                    {link}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto text-center pb-20 lg:pb-28">
          <div className="p-6 bg-white/[0.02] border border-white/10 rounded-tr-[20px] rounded-bl-[20px] rounded-tl-[12px] rounded-br-[12px]">
            <h2 className="text-base font-semibold text-white mb-1">Need Help?</h2>
            <p className="text-sm text-white/40 mb-4">
              Can not find what you are looking for? Reach out to our team.
            </p>
            <a
              href="mailto:cogerphereailabs@gmail.com"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all"
            >
              Contact Support
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}