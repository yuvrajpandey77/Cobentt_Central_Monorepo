import type { Metadata } from "next";
import { Target, Eye, Heart, Shield, Cpu, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Cobentt is an AI workspace for research, development, and creation. Learn about our mission, values, and team.",
};

const values = [
  { icon: Target, title: "Purpose-Built", desc: "Every feature in Cobentt exists to solve a real problem. No bloat, no distractions — just tools that work the way you think." },
  { icon: Eye, title: "Radical Transparency", desc: "We tell you exactly how our AI works, what data we collect, and how it's used. No black boxes, no hidden agendas." },
  { icon: Heart, title: "User-First", desc: "You own your data, your workflows, and your AI. We build for your sovereignty, not our lock-in." },
  { icon: Shield, title: "Privacy by Design", desc: "Local-first architecture, end-to-end encryption, and zero training on your data. Privacy is not a feature — it is a foundation." },
  { icon: Cpu, title: "Model Agnostic", desc: "We believe in choice. Use any model, any provider, any deployment. Cobentt works with them all without favor." },
  { icon: Users, title: "Community-Driven", desc: "Built in the open with input from researchers, developers, and creators who use Cobentt every day." },
];

export default function AboutPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            About
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Built for the way{" "}
            <span className="text-white">you work.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            Cobentt is an AI workspace where research, development, and creation converge. We do not believe in one-size-fits AI — we believe in giving you the tools to build your own workflow.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-16 lg:mb-20">
          <div className="p-6 lg:p-8 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px]">
            <h2 className="text-lg font-semibold text-white mb-3">Our Mission</h2>
            <p className="text-sm text-white/40 leading-relaxed mb-4">
              AI is the most transformative technology of our time — yet most tools lock you into one model, one provider, one way of working. We founded Cobentt to change that.
            </p>
            <p className="text-sm text-white/40 leading-relaxed">
              Our mission is simple: build the workspace that adapts to you. Whether you are a researcher synthesizing papers, a developer shipping code, or a creator bringing ideas to life, Cobentt gives you the freedom to choose the right AI for every task — without sacrificing privacy, control, or quality.
            </p>
          </div>
        </div>

        <div className="mb-20 lg:mb-28">
          <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-10">What We Believe</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {values.map((value) => (
              <div
                key={value.title}
                className="p-5 bg-bg-card border border-white/5 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] hover:border-white/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                  <value.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{value.title}</h3>
                <p className="text-xs text-white/40 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-3xl mx-auto text-center pb-20 lg:pb-28">
          <div className="p-6 lg:p-8 bg-white/[0.02] border border-white/10 rounded-tr-[20px] rounded-bl-[20px] rounded-tl-[12px] rounded-br-[12px]">
            <h2 className="text-lg font-semibold text-white mb-2">Get in Touch</h2>
            <p className="text-sm text-white/40 mb-4">
              Have questions, feedback, or want to collaborate? For industry-level
              integrations and enterprise queries, reach us at{" "}
              <a
                href="mailto:support@cogerphere.com"
                className="text-white/70 hover:text-white transition-colors underline underline-offset-2"
              >
                support@cogerphere.com
              </a>
              .
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/overview/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all"
              >
                Contact Us
              </a>
              <a
                href="mailto:support@cogerphere.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/15 text-sm font-medium text-white/70 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/5 hover:text-white transition-all"
              >
                Email Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}