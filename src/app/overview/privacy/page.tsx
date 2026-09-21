import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Cobentt handles your data, privacy, and security. We believe in radical transparency and user control.",
};

const sections = [
  {
    title: "Information We Collect",
    content: "We collect only the minimum data necessary to provide and improve the Cobentt workspace. This includes account information (email, name, avatar) when you register, usage data (feature interactions, performance metrics) to improve our service, and content data (chats, documents, files) that you explicitly provide within your workspace. We never collect keystroke data, mouse movements, or browsing activity outside our application.",
  },
  {
    title: "How We Use Your Data",
    content: "Your data powers your workspace — nothing more. We use account data to authenticate you and manage your subscription. Usage data helps us identify bugs, optimize performance, and decide which features to build next. Content data is used exclusively to deliver the service you requested: AI chat, document processing, research synthesis, and code analysis. We do not train AI models on your content. Your prompts, documents, and files remain yours.",
  },
  {
    title: "Data Storage & Security",
    content: "All data is encrypted at rest using AES-256 and in transit using TLS 1.3. We use industry-standard cloud providers with SOC 2 compliance for hosted data. If you use local models (Ollama), your data never leaves your machine. We retain your data for as long as your account is active. Upon deletion, all data is permanently erased within 30 days from our servers and backup systems.",
  },
  {
    title: "Third-Party AI Providers",
    content: "Cobentt routes requests to third-party AI providers (OpenAI, Anthropic, Google, etc.) only when you explicitly select them. When using your own API keys, your data is sent directly to the provider under their privacy policy. When using our managed API, we act as a data processor. We never share your personal information with third parties for their own purposes.",
  },
  {
    title: "Your Rights",
    content: "You own your data. Period. You can export all your data at any time via Settings > Export. You can delete your account and all associated data instantly. You can opt out of analytics collection. You can request a copy of all data we hold about you. You can withdraw consent for any processing at any time. Contact us at support@cogerphere.com for any data rights requests.",
  },
  {
    title: "Cookies",
    content: "We use essential cookies only: session cookies for authentication and preference cookies for saving your settings. We do not use tracking cookies, advertising cookies, or third-party analytics cookies. You can disable cookies in your browser settings, though this may affect core functionality like persistent login sessions.",
  },
  {
    title: "Changes to This Policy",
    content: "We will notify you of material changes via email and an in-app notification. Continued use after changes take effect constitutes acceptance of the updated policy. We will never make retroactive changes that reduce your privacy rights without your explicit consent.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-white/50 bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Privacy Policy
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Your data,{" "}
            <span className="text-white">your rules.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-white/40 max-w-xl mx-auto">
            We believe privacy is not a feature — it is a fundamental right. Here is exactly how we handle your data.
          </p>
        </div>

        <div className="max-w-3xl mx-auto pb-20 lg:pb-28 space-y-6">
          {sections.map((section) => (
            <div
              key={section.title}
              className="p-6 lg:p-8 bg-bg-card border border-white/5 rounded-tr-[16px] rounded-bl-[16px] rounded-tl-[10px] rounded-br-[10px] hover:border-white/10 transition-colors"
            >
              <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
              <p className="text-sm text-white/40 leading-relaxed">{section.content}</p>
            </div>
          ))}

          <div className="pt-6 text-center">
            <p className="text-xs text-white/30">
              Last updated: July 2026. If you have questions, email{" "}
              <a href="mailto:support@cogerphere.com" className="text-white/50 hover:text-white transition-colors underline underline-offset-2">
                support@cogerphere.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}