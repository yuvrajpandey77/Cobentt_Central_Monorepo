"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Loader2, MessageSquareHeart, Star, X } from "lucide-react";
import { submitToWeb3Forms } from "@/lib/web3forms";

type Phase = "closed" | "open" | "sent";

/**
 * Global feedback widget — floating button available on every marketing /
 * overview page. Star rating + message, delivered via Web3Forms so the
 * product team gets a real feedback loop from all parts of the app.
 */
export function FeedbackWidget() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");

    const result = await submitToWeb3Forms({
      name: "In-app feedback widget",
      email: email.trim() || "anonymous@cobentt.app",
      topic: "Product feedback (widget)",
      rating: rating > 0 ? rating : undefined,
      message: message.trim(),
      pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    });

    setSending(false);
    if (result.ok) {
      setPhase("sent");
    } else {
      setError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  function reset() {
    setPhase("closed");
    setRating(0);
    setMessage("");
    setEmail("");
    setError("");
  }

  return (
    <>
      {/* Floating trigger */}
      {phase === "closed" && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          onClick={() => setPhase("open")}
          className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 px-4 py-2.5 bg-white text-black text-xs font-medium rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:bg-gray-100 transition-colors"
          aria-label="Share feedback"
        >
          <MessageSquareHeart className="w-4 h-4" />
          Feedback
        </motion.button>
      )}

      <AnimatePresence>
        {phase !== "closed" && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            role="dialog"
            aria-label="Share feedback"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-xs font-semibold text-white flex items-center gap-2">
                <MessageSquareHeart className="w-3.5 h-3.5 text-text-secondary" />
                Rate your experience
              </span>
              <button
                type="button"
                onClick={reset}
                className="p-1 text-text-tertiary hover:text-white transition-colors"
                aria-label="Close feedback"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {phase === "sent" ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-white mb-1">Thanks for the feedback</p>
                <p className="text-xs text-text-tertiary mb-5">
                  It goes straight to the team and shapes what we build next.
                </p>
                <button
                  type="button"
                  onClick={reset}
                  className="text-xs text-text-tertiary hover:text-white underline underline-offset-2 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="px-4 py-4 space-y-3">
                <div className="flex items-center justify-center gap-1 py-1" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} star${star > 1 ? "s" : ""}`}
                      onClick={() => setRating(star === rating ? 0 : star)}
                      onMouseEnter={() => setHover(star)}
                      onMouseLeave={() => setHover(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-6 h-6 transition-colors ${
                          star <= (hover || rating)
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-text-disabled"
                        }`}
                      />
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={3}
                  rows={3}
                  placeholder="What worked? What didn't?"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-text-muted focus:border-white/30 focus:outline-none resize-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional, for follow-up)"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-text-muted focus:border-white/30 focus:outline-none"
                />

                {error && (
                  <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-black text-xs font-medium rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-60 disabled:cursor-wait"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending…
                    </>
                  ) : (
                    "Send feedback"
                  )}
                </button>
                <p className="text-[10px] text-text-muted text-center">
                  Need help instead?{" "}
                  <a href="/overview/contact" className="text-text-tertiary hover:text-white underline underline-offset-2">
                    Contact support
                  </a>
                </p>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
