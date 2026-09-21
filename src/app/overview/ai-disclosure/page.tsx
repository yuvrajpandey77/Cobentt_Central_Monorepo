import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Disclosure",
  description: "How Cobentt uses artificial intelligence, model transparency, data usage, and responsible AI practices.",
};

const sections = [
  {
    title: "AI Models We Use",
    content: "Cobentt is an AI orchestration workspace — we do not train our own foundation models. Instead, we provide a unified interface to leading models from OpenAI (GPT-4, GPT-4o), Anthropic (Claude 3.5 Sonnet, Opus), Google (Gemini Pro, Gemini Ultra), Meta (Llama 3), Mistral, and open-weight models via Ollama. Our proprietary SLM, Meridian, handles planning, routing, and context management but does not generate content directly.",
  },
  {
    title: "Model Behavior & Limitations",
    content: "AI models can produce inaccurate, biased, or harmful outputs. They do not possess consciousness, beliefs, or intentions — they predict text based on patterns in training data. Models may reflect biases present in their training data. They have limited context windows and no persistent memory unless explicitly provided via Cobentt's context engine. They cannot learn from your conversations unless you save them to your project.",
  },
  {
    title: "How Your Data Is Used by AI Providers",
    content: "When you use your own API keys, your prompts and responses are processed directly by the third-party provider under their terms. When using Cobentt's managed API, we forward your request to the selected provider and return the response. We do not allow any provider to train on your data when acting as our processor. We have data processing agreements in place with all major providers that prohibit training on customer content.",
  },
  {
    title: "Meridian — Our Orchestration Layer",
    content: "Meridian is a small language model (SLM) developed by Cobentt for routing, planning, and context retrieval. It analyzes your request, retrieves relevant context from your knowledge base, plans the optimal execution strategy, selects the best model for the task, and verifies the response for quality and safety. Meridian does not generate creative content — it orchestrates. It runs in your browser or on our servers depending on your deployment choice.",
  },
  {
    title: "Human Oversight",
    content: "AI-generated outputs in Cobentt are not reviewed by humans unless you explicitly share them for support or feedback purposes. We may sample anonymized interactions to improve Meridian's routing accuracy and safety filters. We do not employ AI to make automated decisions that significantly affect your legal rights or access to services.",
  },
  {
    title: "Responsible AI Practices",
    content: "We implement safety filters for harmful content, prompt injection detection, output validation against known harmful patterns, rate limiting to prevent abuse, and user reporting mechanisms for problematic outputs. We publish transparency reports quarterly detailing model performance, safety incidents, and improvements. We are committed to the responsible deployment of AI technology.",
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