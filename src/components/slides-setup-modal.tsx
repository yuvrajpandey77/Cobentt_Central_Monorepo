"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { SlidesLaunchpad } from "./slides-launchpad";

/**
 * Centered middle-card overlay for presentation setup.
 * Used instead of rendering the options inline below the input box —
 * the setup floats on top of the page with a dimmed backdrop.
 */
export function SlidesSetupModal({
  open,
  initialTopic = "",
  modalKey,
  onClose,
  onCreate,
}: {
  open: boolean;
  initialTopic?: string;
  modalKey?: string;
  onClose: () => void;
  onCreate: (prompt: string, templateId: string) => void;
}) {
  // Lock background scroll + close on Escape while the card is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Set up your presentation"
    >
      {/* dimmed backdrop */}
      <button
        aria-label="Close setup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />
      {/* middle card */}
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto thin-scrollbar rounded-[28px] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/50 text-text-tertiary backdrop-blur transition hover:text-white hover:border-white/30"
        >
          <X className="h-4 w-4" />
        </button>
        <SlidesLaunchpad
          key={modalKey ?? initialTopic ?? "slides-setup"}
          initialTopic={initialTopic}
          onCreate={onCreate}
        />
      </div>
    </div>
  );
}
