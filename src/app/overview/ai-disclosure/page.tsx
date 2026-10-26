import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Disclosure",
  description: "How Cobentt uses artificial intelligence, model transparency, data usage, and responsible AI practices.",
};

const sections = [
  {
    title: "AI Models We Use",
    content: "Cobentt does not train its own foundation models. By default, Cobentt Cloud answers with hosted models routed through OpenRouter, which chooses the model that answers your request. You can also use on-device models that run entirely on your phone, such as Meridian Nano, or add your own OpenRouter key or custom endpoint. The model used for each answer is shown in the app.",
  },
  {
    title: "Model Behavior & Limitations",
    content: "AI models can produce inaccurate, biased, or harmful outputs. They do not possess consciousness, beliefs, or intentions — they predict text based on patterns in training data. Models may reflect biases present in their training data. They have limited context windows and no persistent memory unless explicitly provided via Cobentt's context engine. They cannot learn from your conversations unless you save them to your project.",
  },
  {
    title: "How Your Data Is Used by AI Providers",
    content: "With Cobentt Cloud, your request is sent through our gateway to OpenRouter and then to the model that answers it. We record the model and token counts for billing; we do not keep the text of your chats on our servers. With your own key or custom endpoint, your request goes directly to that provider under its terms. On-device models process everything on your phone. For how your data is stored and deleted, see the Privacy Policy.",
  },
  {
    title: "Human Oversight",
    content: "AI-generated outputs are not reviewed by people unless you choose to share them with support. Cobentt does not use AI to make decisions that affect your legal rights or access to services.",
  },
  {
    title: "Limits you should know about",
    content: "AI answers can be wrong. Check anything important, especially medical, legal or financial advice, before you act on it. Web search results used in an answer are shown with their sources in the app.",
  },
];

export default function AIDisclosurePage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            AI Disclosure
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Transparent about{" "}
            <span className="text-white">AI.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            We believe in radical transparency. Here is exactly how AI works in Cobentt, what models we use, and how your data is handled.
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
        </div>
      </div>
    </main>
  );
}