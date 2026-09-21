import type { Metadata } from "next";
import { ArrowRight, Clock, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on AI, research, development, and building the future of work — from the Cobentt team.",
};

const posts = [
  {
    title: "Introducing Meridian: Our Orchestration Layer",
    excerpt: "How we built a purpose-built SLM that plans, routes, retrieves context, and verifies every response before you see it.",
    date: "Jun 15, 2026",
    readTime: "8 min read",
    tag: "Engineering",
  },
  {
    title: "Why Model Agnosticism Matters",
    excerpt: "Lock-in is the enemy of progress. Here is why we believe the future of AI is choosing the right model for every task.",
    date: "May 28, 2026",
    readTime: "6 min read",
    tag: "Philosophy",
  },
  {
    title: "Privacy in the Age of AI",
    excerpt: "A deep dive into Cobentt's local-first architecture, encryption model, and why we never train on your data.",
    date: "May 10, 2026",
    readTime: "10 min read",
    tag: "Privacy",
  },
  {
    title: "Building a Research Pipeline with AI",
    excerpt: "From source collection to citation generation — how Cobentt's research pipeline transforms the way academics work.",
    date: "Apr 22, 2026",
    readTime: "7 min read",
    tag: "Research",
  },
];

export default function BlogPage() {
  return (
    <main className="pt-24 lg:pt-28">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="text-center mb-16 lg:mb-20 pt-8">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium text-text-tertiary bg-white/5 border border-white/10 rounded-tr-[8px] rounded-bl-[8px] rounded-tl-[5px] rounded-br-[5px] mb-4">
            <BookOpen className="w-3 h-3" />
            Blog
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Thoughts on{" "}
            <span className="text-white">building.</span>
          </h1>
          <p className="mt-4 text-base lg:text-lg text-text-tertiary max-w-xl mx-auto">
            Stories, insights, and deep dives from the Cobentt team.
          </p>
        </div>

        <div className="max-w-3xl mx-auto pb-20 lg:pb-28 space-y-4">
          {posts.map((post) => (
            <div
              key={post.title}
              className="p-5 lg:p-6 bg-bg-card border border-white/5 rounded-tr-[14px] rounded-bl-[14px] rounded-tl-[8px] rounded-br-[8px] hover:border-white/10 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium text-text-muted bg-white/5 px-2 py-0.5 rounded-tr-[4px] rounded-bl-[4px] rounded-tl-[3px] rounded-br-[3px]">
                  {post.tag}
                </span>
                <span className="text-[10px] text-text-disabled flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {post.date}
                </span>
                <span className="text-[10px] text-text-disabled">{post.readTime}</span>
              </div>
              <h2 className="text-base font-semibold text-white mb-1 group-hover:text-white/80 transition-colors">{post.title}</h2>
              <p className="text-sm text-text-tertiary leading-relaxed">{post.excerpt}</p>
              <div className="mt-3 flex items-center gap-1 text-[11px] text-text-muted group-hover:text-text-tertiary transition-colors">
                Read more <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}