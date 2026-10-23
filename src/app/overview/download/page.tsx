import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Menu, MonitorSmartphone, Smartphone, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Download",
  description:
    "Get Cobentt — available now in the browser, with the mobile app rolling out on Android.",
};

const platforms = [
  {
    icon: Globe,
    name: "Web",
    status: "Available now",
    statusTone: "available" as const,
    desc: "The full Cobentt workspace runs in your browser. No install needed.",
    href: "/",
    cta: "Open Workspace",
    external: false,
  },
  {
    icon: Smartphone,
    name: "Android",
    status: "Early access",
    statusTone: "early" as const,
    desc: "On-device SLM chat with Meridian. Rolling out gradually — request access and we'll send you the link.",
    href: "/overview/contact",
    cta: "Request access",
    external: false,
  },
  {
    icon: MonitorSmartphone,
    name: "Desktop",
    status: "In development",
    statusTone: "soon" as const,
    desc: "A native desktop build is planned. Join the contact list to get notified first.",
    href: "/overview/contact",
    cta: "Notify me",
    external: false,
  },
];

const statusStyles = {
  available: "bg-white/15 text-text-secondary border-white/20",
  early: "bg-accent/10 text-accent border-accent/20",
  soon: "bg-white/5 text-text-disabled border-white/10",
};

export default function DownloadPage() {
  return (
    <main>
      <section className="pt-36 lg:pt-44 pb-16 lg:pb-24">
        <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-6">
              <Menu className="w-3 h-3 text-text-tertiary" />
              Download
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight">
              Take Cobentt{" "}
              <span className="text-white">everywhere.</span>
            </h1>
            <p className="mt-5 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
              Start in the browser today. Mobile and desktop builds are on their way.
            </p>
          </div>

          <div className="max-w-4xl mx-auto mt-14 grid gap-4 sm:grid-cols-3">
            {platforms.map((p, i) => (
              <div
                key={p.name}
                className={`p-6 bg-bg-card border border-white/10 flex flex-col ${
                  i % 2 === 0
                    ? "rounded-tl-[28px] rounded-tr-[10px] rounded-br-[28px] rounded-bl-[10px]"
                    : "rounded-tl-[10px] rounded-tr-[28px] rounded-br-[10px] rounded-bl-[28px]"
                }`}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[6px] rounded-br-[6px] bg-white/10 flex items-center justify-center">
                    <p.icon className="w-5 h-5 text-text-secondary" />
                  </div>
                  <span
                    className={`text-[9px] font-medium px-2 py-1 border rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] ${statusStyles[p.statusTone]}`}
                  >
                    {p.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white mb-1.5">{p.name}</h2>
                <p className="text-sm text-text-tertiary leading-relaxed flex-1">{p.desc}</p>
                <a
                  href={p.href}
                  className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-bg-primary text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all"
                >
                  {p.cta}
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto mt-10 p-6 lg:p-8 bg-bg-card border border-white/10 rounded-tl-[40px] rounded-tr-[16px] rounded-br-[40px] rounded-bl-[16px]">
            <h3 className="text-base font-semibold text-white mb-2">System requirements</h3>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-text-tertiary">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Web — any modern browser (Chrome, Firefox, Safari, Edge)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Android — Android 8.0+ for on-device SLM chat
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Internet required for frontier models; optional for local Ollama
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                Your API keys stay on your device — BYOK supported on all platforms
              </li>
            </ul>
          </div>

          <div className="max-w-4xl mx-auto mt-6 text-center">
            <p className="text-xs text-text-muted">
              Not sure where to start?{" "}
              <Link
                href="/overview/features"
                className="text-text-tertiary hover:text-white underline underline-offset-2 transition-colors"
              >
                See what Cobentt can do
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
