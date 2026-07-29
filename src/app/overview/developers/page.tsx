import type { Metadata } from "next";
import {
  Code2,
  GitPullRequest,
  Terminal,
  GitBranch,
  Bug,
  Rocket,
  FileCode,
  Cpu,
  BookOpen,
  Puzzle,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Developers",
  description: "Build with Cobentt. API, SDK, CLI, and integrations for developers.",
};

const features = [
  { icon: Code2, title: "VS Code Integration", desc: "Connect Cobentt to VS Code. AI understands your codebase, writes code, and helps you debug — without leaving your editor." },
  { icon: GitPullRequest, title: "GitHub Sync", desc: "Sync your projects with GitHub. Review PRs, generate commit messages, and automate workflows with AI." },
  { icon: Terminal, title: "Built-in Terminal", desc: "Full terminal emulator inside Cobentt. Run commands, scripts, and tests without switching contexts." },
  { icon: GitBranch, title: "Artifacts", desc: "Version-controlled artifacts for code, documents, and configurations. Branch, diff, and merge like git." },
  { icon: Bug, title: "AI Debugging", desc: "Paste error messages, stack traces, or broken code. AI identifies the root cause and suggests fixes." },
  { icon: Rocket, title: "Deployments", desc: "Deploy directly from Cobentt. Connect to Vercel, Netlify, AWS, or any custom deployment target." },
  { icon: FileCode, title: "Code Generation", desc: "Generate production-ready code in any language. AI understands your existing patterns and follows your conventions." },
  { icon: Cpu, title: "Local Models", desc: "Run Cobentt with local models via Ollama. Full offline capability for sensitive codebases." },
];

const sdkFeatures = [
  { icon: BookOpen, title: "REST API", desc: "Full REST API for chat, documents, projects, and agents. Integrate Cobentt into your existing workflows." },
  { icon: FileCode, title: "TypeScript SDK", desc: "First-class TypeScript SDK with full type safety. Works with Node.js, Bun, and Deno." },
  { icon: Terminal, title: "CLI Tool", desc: "Command-line interface for scripting, automation, and CI/CD pipelines. Pipe data in and out of Cobentt." },
  { icon: Puzzle, title: "Extension API", desc: "Build custom extensions, tools, and integrations. Extend Cobentt with your own functionality." },
];

export default function DevelopersPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            <Code2 className="w-3 h-3" />
            For Developers
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Build with Cobentt.{" "}
            <span className="text-white">Ship faster.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            AI-powered development tools, SDKs, and APIs for building production software.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-20 lg:mb-28 max-w-5xl mx-auto">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="p-5 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] hover:border-white/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                <feat.icon className="w-4.5 h-4.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{feat.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-20 lg:mb-28">
          <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-10">SDK & API</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {sdkFeatures.map((feat) => (
              <div
                key={feat.title}
                className="p-5 bg-bg-card border border-white/5 rounded-tl-[20px] rounded-tr-[8px] rounded-br-[20px] rounded-bl-[8px] hover:border-white/20 transition-colors"
              >
                <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                  <feat.icon className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{feat.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center pb-20 lg:pb-28">
          <p className="text-base lg:text-lg text-white/40 mb-6">
            Ready to build with the Cobentt API?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="/overview/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all"
            >
              Read the docs
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
            <a
              href="https://github.com"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-white/50 hover:text-white transition-all"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              Browse GitHub
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}