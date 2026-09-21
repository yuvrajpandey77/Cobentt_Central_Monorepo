import type { Metadata } from "next";
import { Mail, Trash2, Clock, Download, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Account Deletion",
  description: "How to delete your Cobentt account, what data is removed, and what happens after deletion.",
};

const steps = [
  {
    icon: Download,
    title: "1. Export Your Data (Optional)",
    content: "Before deleting, you can export all your data including chats, documents, projects, and settings via Settings > Export Data. We recommend this if you want to keep a copy of your work.",
  },
  {
    icon: Trash2,
    title: "2. Initiate Deletion",
    content: 'Go to Settings > Account > Delete Account. Click "Delete My Account" and confirm your choice. You will be asked to enter your password to verify your identity.',
  },
  {
    icon: Clock,
    title: "3. Grace Period (30 Days)",
    content: "After initiating deletion, your account enters a 30-day grace period. During this time, your data is preserved but your account is inaccessible. You can cancel deletion by logging in and following the restore link sent to your email.",
  },
  {
    icon: ShieldCheck,
    title: "4. Permanent Deletion",
    content: "After 30 days, your account and all associated data are permanently and irreversibly deleted. This includes your profile, projects, chats, documents, API keys, billing information, and usage history. This action cannot be undone.",
  },
];

const faqs = [
  {
    q: "What data is deleted?",
    a: "All data is permanently deleted: account profile, authentication methods, projects, chats, documents, files, API keys, billing history, usage logs, and any stored preferences or settings. This deletion is irreversible.",
  },
  {
    q: "What data is retained?",
    a: "We may retain anonymized, aggregated usage statistics that cannot be linked back to you. If required by law, we may retain certain billing records for tax/audit purposes for the legally mandated period. These are stripped of personal identifiers where possible.",
  },
  {
    q: "Can I reactivate my account?",
    a: "During the 30-day grace period, yes — simply log in and follow the restore prompt. After permanent deletion, no. All data is gone and cannot be recovered. We recommend exporting your data first.",
  },
  {
    q: "What about third-party AI providers?",
    a: "Cobentt does not control data stored by third-party AI providers (OpenAI, Anthropic, etc.) when you use your own API keys. You must delete data from those services separately. For Cobentt-managed API usage, we ensure your data is deleted from provider caches within 30 days.",
  },
  {
    q: "How long does billing stop?",
    a: "Billing stops immediately upon initiation of deletion. You will not be charged after the deletion request is processed. If you are on a paid plan, you will retain access until the end of your current billing period.",
  },
];

export default function AccountDeletionPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Account Deletion
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Leaving?{" "}
            <span className="text-white">We understand.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Here is exactly what happens when you delete your Cobentt account — no hidden processes, no surprises.
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-16 lg:mb-20">
          <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-8">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {steps.map((step) => (
              <div
                key={step.title}
                className="p-5 bg-bg-card border border-white/5 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] hover:border-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-tr-[6px] rounded-bl-[6px] rounded-tl-[4px] rounded-br-[4px] bg-white/10 flex items-center justify-center mb-3">
                  <step.icon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-xs text-text-tertiary leading-relaxed">{step.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 p-5 bg-white/[0.02] border border-white/10 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] text-center">
            <p className="text-sm text-text-tertiary">
              To initiate deletion, go to{" "}
              <span className="text-text-secondary font-mono text-xs bg-white/5 px-1.5 py-0.5 rounded">Settings → Account → Delete Account</span>
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto pb-20 lg:pb-28">
          <h2 className="text-xl lg:text-2xl font-bold text-white text-center mb-8">
            Common Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group border border-white/10 bg-bg-card rounded-tr-[12px] rounded-bl-[12px] rounded-tl-[8px] rounded-br-[8px] overflow-hidden"
              >
                <summary className="px-5 py-3.5 text-sm font-medium text-text-secondary cursor-pointer hover:text-white transition-colors list-none flex items-center justify-between">
                  {item.q}
                  <ArrowRight className="w-3 h-3 text-text-muted rotate-90 group-open:rotate-[-90deg] transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-4 text-sm text-text-tertiary leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-text-tertiary">
              <Mail className="w-3.5 h-3.5" />
              Need help?{" "}
              <a href="mailto:support@cogerphere.com" className="text-text-tertiary hover:text-white transition-colors underline underline-offset-2">
                support@cogerphere.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}