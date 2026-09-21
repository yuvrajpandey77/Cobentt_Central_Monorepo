import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing your use of the Cobentt AI workspace platform.",
};

const sections = [
  {
    title: "Acceptance of Terms",
    content: "By accessing or using Cobentt, you agree to be bound by these Terms of Service. If you do not agree, do not use the service. We may update these terms at any time; continued use after changes constitutes acceptance. You are responsible for reviewing these terms periodically.",
  },
  {
    title: "Your Account",
    content: "You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must be at least 13 years old to use Cobentt. Accounts registered by bots or automated methods are prohibited. You may not share API keys or access credentials with unauthorized parties.",
  },
  {
    title: "Acceptable Use",
    content: "You agree not to use Cobentt for any unlawful purpose or in violation of any applicable laws. You may not use the service to generate harmful, abusive, or deceptive content; to distribute malware or engage in hacking; to violate intellectual property rights; or to circumvent any technical restrictions we impose. We reserve the right to suspend accounts that violate these rules.",
  },
  {
    title: "Intellectual Property",
    content: "You retain full ownership of all content you create using Cobentt — your prompts, documents, code, images, and research. We claim no intellectual property rights over your content. Cobentt's name, logo, interface design, and underlying technology are our intellectual property and may not be copied, modified, or reverse-engineered.",
  },
  {
    title: "AI-Generated Content",
    content: "AI-generated content may be inaccurate, incomplete, or biased. You are solely responsible for verifying and using AI outputs appropriately. Cobentt provides no warranty regarding the accuracy, reliability, or quality of AI-generated content. Do not rely on AI outputs for professional advice (medical, legal, financial) without independent verification.",
  },
  {
    title: "Service Level",
    content: "We strive to maintain 99.9% uptime for our hosted service but cannot guarantee uninterrupted availability. We may perform scheduled maintenance with reasonable notice. Free tier users may experience rate limits and reduced priority. We are not liable for damages arising from service interruptions or data loss beyond our reasonable control.",
  },
  {
    title: "Limitation of Liability",
    content: "Cobentt and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim. Some jurisdictions do not allow certain limitations, so this may not apply to you.",
  },
  {
    title: "Termination",
    content: "You may terminate your account at any time via Settings > Delete Account. We may suspend or terminate your account for violation of these terms, with or without notice. Upon termination, your data will be permanently deleted within 30 days. Sections on IP, liability, and dispute resolution survive termination.",
  },
  {
    title: "Governing Law",
    content: "These terms are governed by the laws of the State of California, without regard to conflict of law principles. Any disputes arising from these terms shall be resolved in the courts of San Francisco County, California. We encourage you to contact us first to resolve any issues informally.",
  },
];

export default function TermsPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Terms of Service
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Clear terms.{" "}
            <span className="text-white">Fair play.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            The legal bits. We kept them straightforward so you can focus on building.
          </p>
        </div>

        <div className="max-w-3xl mx-auto pb-20 lg:pb-28 space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-6 lg:p-8 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] hover:border-white/10 transition-colors"
            >
              <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-sm text-text-tertiary leading-relaxed">{section.content}</p>
            </div>
          ))}

          <div className="pt-6 text-center">
            <p className="text-xs text-text-muted">
              Last updated: July 2026. Questions?{" "}
              <a href="mailto:support@cogerphere.com" className="text-text-tertiary hover:text-white transition-colors underline underline-offset-2">
                Contact us
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}