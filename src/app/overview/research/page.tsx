import type { Metadata } from "next";
import Link from "next/link";
import {
  Globe,
  FileText,
  Database,
  FileSearch,
  Quote,
  FileEdit,
  Eye,
  Download,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Research",
  description: "Deep research with AI — collect sources, read PDFs, generate citations, and synthesize findings.",
};

const pipelineSteps = [
  { icon: Globe, step: "01", title: "Collect Sources", desc: "Search the web, academic databases, or upload your own documents. Cobentt supports PDFs, web pages, arXiv, PubMed, and custom sources." },
  { icon: FileText, step: "02", title: "Read PDFs", desc: "AI reads and understands PDFs — extracting text, tables, figures, equations, and citations with layout-aware parsing." },
  { icon: Database, step: "03", title: "Extract Data", desc: "Parse structured and unstructured information. Extract key findings, methodologies, and data points across multiple documents." },
  { icon: FileSearch, step: "04", title: "Compare Papers", desc: "Cross-reference findings, identify conflicting results, and discover relationships between papers automatically." },
  { icon: Quote, step: "05", title: "Generate Citations", desc: "Auto-format citations in APA, MLA, Chicago, IEEE, or any custom style. Every claim links back to its source." },
  { icon: FileEdit, step: "06", title: "Write Draft", desc: "AI-assisted synthesis into structured output. Literature reviews, survey papers, technical reports, and research notes." },
  { icon: Eye, step: "07", title: "Review", desc: "Fact-check every statement against the original sources. Verify citations, check for hallucinations, and validate reasoning." },
  { icon: Download, step: "08", title: "Export", desc: "Export your research as Markdown, PDF, LaTeX, DOCX, or HTML. Includes all citations, notes, and source metadata." },
];

const useCases = [
  { title: "Academic Research", desc: "Literature reviews, paper analysis, citation management, and thesis writing with AI that understands academic content." },
  { title: "Market Research", desc: "Competitive analysis, market reports, trend identification, and data synthesis from multiple sources." },
  { title: "Technical Research", desc: "Deep dives into technical documentation, API specs, research papers, and engineering reports." },
  { title: "Legal Research", desc: "Case law analysis, statute review, contract comparison, and legal document synthesis." },
];

export default function ResearchPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            <BookOpen className="w-3 h-3" />
            Research
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            From source.{" "}
            <span className="text-white">To citation.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            A complete AI-powered research pipeline — from collecting sources to exporting a fully cited paper.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mb-20 lg:mb-28">
          <div className="relative">
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-white/20" />
            <div className="space-y-5">
              {pipelineSteps.map((step) => (
                <div key={step.step} className="relative flex items-start gap-4 group">
                  <div className="relative z-10 w-[46px] h-[46px] flex items-center justify-center bg-bg-card border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] group-hover:border-white/30 transition-colors flex-shrink-0">
                    <step.icon className="w-4 h-4 text-text-tertiary" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-text-disabled font-mono">{step.step}</span>
                      <h3 className="text-sm font-semibold text-white/80">{step.title}</h3>
                    </div>
                    <p className="text-xs text-text-tertiary mt-1 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-20 lg:mb-28">
          <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-10">Use cases</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="p-5 bg-bg-card border border-white/5 rounded-tl-[20px] rounded-tr-[8px] rounded-br-[20px] rounded-bl-[8px] hover:border-white/20 transition-colors"
              >
                <h3 className="text-sm font-semibold text-white mb-1.5">{useCase.title}</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center pb-20 lg:pb-28">
          <p className="text-base lg:text-lg text-text-tertiary mb-6">
            Ready to accelerate your research?
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-gray-100 transition-all"
          >
            Open Workspace
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </main>
  );
}