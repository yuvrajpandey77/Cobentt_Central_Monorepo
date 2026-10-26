import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Cobentt collects, who processes it, and how you control it.",
};

const sections = [
  {
    title: "What we collect",
    content:
      "Account details from sign-in: email, name and profile picture (managed by Clerk). Billing details for paid plans are handled by Razorpay; we store your plan, renewal date and usage totals. Usage counts such as tokens and request totals, which power your usage screen and limits. Your chats, documents and files are stored on your device when you use on-device chat. When you use Cobentt Cloud, your messages are sent to the AI model provider to produce an answer (see below).",
  },
  {
    title: "Cobentt Cloud (the default)",
    content:
      "New accounts start on Cobentt Cloud. Your message and the context needed to answer it are sent through our gateway to OpenRouter, which routes it to the model that answers. We record the model used and the token counts for billing; we do not keep the text of your chats on our servers. You can switch to on-device chat in Settings, and then your messages stay on your phone.",
  },
  {
    title: "On-device chat (optional)",
    content:
      "On-device models run entirely on your phone. Your prompts and answers do not leave the device. Model files are downloaded from Hugging Face when you choose to download one. Downloaded files stay on the device until you delete them.",
  },
  {
    title: "Your own API key",
    content:
      "If you add your own OpenRouter key or a custom endpoint, requests go directly from your device to that provider under its terms. We do not see those messages. Keys are stored on your device in secure storage and are not sent to our servers.",
  },
  {
    title: "Who processes your data",
    content:
      "Clerk: sign-in and account identity. Razorpay: payments for paid plans. OpenRouter: AI model routing for Cobentt Cloud. Vercel: website analytics on this site. Inngest: background jobs that run AI workflows on the website. Hugging Face: serves on-device model files. We do not sell your personal information.",
  },
  {
    title: "Analytics",
    content:
      "This website uses Vercel Analytics to count page views. It does not set tracking cookies. You can opt out in Settings → Privacy; the opt-out takes effect the next time you load the site. The mobile app does not send analytics events.",
  },
  {
    title: "Security and backups",
    content:
      "Connections to Cobentt use HTTPS. Database backups are encrypted with AES-256 and kept for 14 days, after which they are deleted.",
  },
  {
    title: "Your choices",
    content:
      "On the website you can export your data from Settings → Privacy → Export. In the mobile app you can delete all local data from Settings, and delete your account from Account → Delete Account. You can disable cookies in your browser, but sign-in needs its session cookie. For anything else, email support@cogerphere.com.",
  },
  {
    title: "Cookies",
    content:
      "We use only the cookies sign-in needs, plus a single preference that stores your analytics opt-out. We do not use advertising cookies.",
  },
  {
    title: "Changes to this policy",
    content:
      "If we make a material change to this policy, we will show it on this page and tell signed-in users in the app before it takes effect.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Privacy Policy
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Your data,{" "}
            <span className="text-white">your rules.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            This policy is the same for the website and the mobile app. Here is what happens to your data, and who handles it.
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
              Last updated: October 2026. If you have questions, email{" "}
              <a href="mailto:support@cogerphere.com" className="text-text-tertiary hover:text-white transition-colors underline underline-offset-2">
                support@cogerphere.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
