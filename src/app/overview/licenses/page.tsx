import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Licenses",
  description: "Open-source licenses, third-party attributions, and software licensing information for Cobentt.",
};

const licenseGroups = [
  {
    title: "Cobentt Application",
    items: [
      { name: "Cobentt Workspace", license: "Proprietary — All Rights Reserved", note: "The Cobentt application, including its UI, backend services, and Meridian orchestration layer, is proprietary software. You may not copy, modify, distribute, or reverse-engineer it." },
      { name: "Cobentt Brand Assets", license: "Proprietary — All Rights Reserved", note: "The Cobentt name, logo, wordmark, and visual identity are trademarked. Use of brand assets requires prior written permission." },
    ],
  },
  {
    title: "Open Source Software",
    items: [
      { name: "Next.js", license: "MIT License", note: "Copyright (c) 2024 Vercel Inc. MIT License — permission granted to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies." },
      { name: "React", license: "MIT License", note: "Copyright (c) Meta Platforms, Inc. MIT License." },
      { name: "Tailwind CSS", license: "MIT License", note: "Copyright (c) Tailwind Labs, Inc. MIT License." },
      { name: "Framer Motion", license: "MIT License", note: "Copyright (c) 2024 Framer B.V. MIT License." },
      { name: "Lucide Icons", license: "ISC License", note: "Copyright (c) Lucide Contributors. ISC License — permission to use, copy, modify, and distribute." },
      { name: "Radix UI", license: "MIT License", note: "Copyright (c) WorkOS. MIT License." },
      { name: "Zod", license: "MIT License", note: "Copyright (c) Colin McDonnell. MIT License." },
      { name: "React Hook Form", license: "MIT License", note: "Copyright (c) 2019-present Blue Bill. MIT License." },
    ],
  },
  {
    title: "AI Model Licenses",
    items: [
      { name: "Meridian SLM", license: "Proprietary", note: "Meridian is Cobentt's proprietary small language model used for orchestration, routing, planning, and context retrieval." },
      { name: "OpenAI Models (GPT-4, GPT-4o)", license: "OpenAI Terms of Use", note: "Access via OpenAI API. Subject to OpenAI's use policy and content policy." },
      { name: "Anthropic Models (Claude)", license: "Anthropic Commercial Terms", note: "Access via Anthropic API. Subject to Anthropic's acceptable use policy." },
      { name: "Google Models (Gemini)", license: "Google Terms of Service", note: "Access via Google AI API. Subject to Google's prohibited use policy." },
      { name: "Meta Llama 3", license: "LLama 3 Community License", note: "Copyright (c) Meta Platforms, Inc. Custom commercial license with acceptable use provisions." },
      { name: "Mistral Models", license: "Mistral AI License", note: "Open-weight models with permissive commercial use. Attribution required." },
    ],
  },
];

export default function LicensesPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            Licenses
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Built on the shoulders of{" "}
            <span className="text-white">open source.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            We stand on the work of thousands of open-source contributors. Here are the licenses that make Cobentt possible.
          </p>
        </div>

        <div className="max-w-4xl mx-auto pb-20 lg:pb-28 space-y-12 lg:space-y-16">
          {licenseGroups.map((group) => (
            <div key={group.title}>
              <h2 className="text-xl lg:text-2xl font-bold text-white mb-6">{group.title}</h2>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div
                    key={item.name}
                    className="p-5 bg-bg-card border border-white/5 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] hover:border-white/10 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                      <span className="text-[10px] font-medium text-text-muted bg-white/5 px-2 py-0.5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px] shrink-0">
                        {item.license}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary leading-relaxed">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}