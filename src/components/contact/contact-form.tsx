"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send, Star } from "lucide-react";
import {
  CONTACT_TOPICS,
  SUPPORT_EMAIL,
  submitToWeb3Forms,
  type ContactTopic,
} from "@/lib/web3forms";

interface ContactFormProps {
  initialTopic?: ContactTopic;
  compact?: boolean;
}

const inputClass =
  "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] text-sm text-white placeholder-text-muted focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 transition-all";

export function ContactForm({ initialTopic = "general", compact = false }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [topic, setTopic] = useState<ContactTopic>(initialTopic);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");

  const topicLabel = CONTACT_TOPICS.find((t) => t.value === topic)?.label ?? topic;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    setError("");

    const result = await submitToWeb3Forms({
      name: name.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      topic: topicLabel,
      rating: rating > 0 ? rating : undefined,
      message: message.trim(),
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });

    if (result.ok) {
      setStatus("success");
    } else {
      setStatus("error");
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className="p-8 text-center">
        <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Message sent</h3>
        <p className="text-sm text-text-tertiary max-w-md mx-auto">
          Thanks {name ? name.split(" ")[0] : "there"} — our team will get back to
          you at <span className="text-text-secondary">{email}</span>. For urgent
          issues, email us directly at{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-text-secondary hover:text-white underline underline-offset-2"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage("");
            setRating(0);
          }}
          className="mt-6 text-xs text-text-tertiary hover:text-white transition-colors underline underline-offset-2"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-medium text-text-tertiary mb-1.5">
            Name *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
            autoComplete="name"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="block text-xs font-medium text-text-tertiary mb-1.5">
            Email *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-topic" className="block text-xs font-medium text-text-tertiary mb-1.5">
            Topic *
          </label>
          <select
            id="contact-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value as ContactTopic)}
            className={`${inputClass} appearance-none [&>option]:bg-zinc-900`}
          >
            {CONTACT_TOPICS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        {!compact && (
          <div>
            <label htmlFor="contact-company" className="block text-xs font-medium text-text-tertiary mb-1.5">
              Company <span className="text-text-muted">(optional)</span>
            </label>
            <input
              id="contact-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              autoComplete="organization"
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div>
        <span className="block text-xs font-medium text-text-tertiary mb-1.5">
          How would you rate Cobentt so far? <span className="text-text-muted">(optional)</span>
        </span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              onClick={() => setRating(star === rating ? 0 : star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= (hoverRating || rating)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-text-disabled"
                }`}
              />
            </button>
          ))}
          {rating > 0 && (
            <span className="ml-2 text-xs text-text-tertiary">{rating}/5</span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs font-medium text-text-tertiary mb-1.5">
          Message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={compact ? 4 : 6}
          minLength={10}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            topic === "integration"
              ? "Tell us about your use case, scale, timeline, and compliance needs…"
              : topic === "issue"
                ? "Describe what happened, what you expected, and steps to reproduce…"
                : "How can we help?"
          }
          className={`${inputClass} resize-y min-h-[120px]`}
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-black text-sm font-medium rounded-tr-[10px] rounded-bl-[10px] rounded-tl-[6px] rounded-br-[6px] hover:bg-white/90 transition-all disabled:opacity-60 disabled:cursor-wait"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" /> Send message
          </>
        )}
      </button>
      <p className="text-[11px] text-text-muted text-center">
        Prefer email? Write to{" "}
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="text-text-tertiary hover:text-white underline underline-offset-2"
        >
          {SUPPORT_EMAIL}
        </a>
      </p>
    </form>
  );
}
