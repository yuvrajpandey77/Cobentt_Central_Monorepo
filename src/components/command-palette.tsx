"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/** href "help" opens the shortcut sheet instead of navigating. */
type Entry = { id: string; label: string; href: string; hint: string };

const PAGES: Entry[] = [
  { id: "chat", label: "Chat", href: "/chat", hint: "G then C" },
  { id: "projects", label: "Projects", href: "/all-projects", hint: "G then P" },
  { id: "settings", label: "Settings", href: "/settings", hint: "G then S" },
  { id: "billing", label: "Billing", href: "/settings/billing", hint: "G then B" },
  { id: "pricing", label: "Pricing", href: "/overview/pricing", hint: "G then R" },
  { id: "docs", label: "Documentation", href: "/overview/docs", hint: "G then D" },
];

const ACTIONS: Entry[] = [
  { id: "new-chat", label: "New chat", href: "/chat", hint: "C" },
  { id: "shortcuts", label: "Keyboard shortcuts", href: "help", hint: "?" },
];

/** Keys after "g" that jump to a page. Derived from PAGES so the palette and the shortcut sheet never disagree. */
const G_SEQUENCE: Record<string, string> = Object.fromEntries(
  PAGES.map((p) => [p.hint.split(" then ")[1].toLowerCase(), p.href]),
);

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

/**
 * Cmd/Ctrl+K command palette, "?" shortcut sheet, and g-then-letter navigation.
 * Single-key shortcuts are ignored while typing in a field, so chat input is never hijacked.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef(false);
  const gTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const clearPending = () => {
      pendingG.current = false;
      window.clearTimeout(gTimer.current);
    };

    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || open || helpOpen) return;

      const key = e.key.toLowerCase();
      if (pendingG.current) {
        clearPending();
        const href = G_SEQUENCE[key];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (key === "g") {
        pendingG.current = true;
        gTimer.current = window.setTimeout(() => {
          pendingG.current = false;
        }, 1000);
        return;
      }
      if (key === "c") {
        e.preventDefault();
        router.push("/chat");
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearPending();
    };
  }, [router, open, helpOpen]);

  const choose = (entry: Entry) => {
    setOpen(false);
    if (entry.href === "help") setHelpOpen(true);
    else router.push(entry.href);
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen} title="Command menu" description="Search pages and actions">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Pages">
            {PAGES.map((entry) => (
              <CommandItem key={entry.id} value={`${entry.label} ${entry.href}`} onSelect={() => choose(entry)}>
                {entry.label}
                <CommandShortcut>{entry.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            {ACTIONS.map((entry) => (
              <CommandItem key={entry.id} value={entry.label} onSelect={() => choose(entry)}>
                {entry.label}
                <CommandShortcut>{entry.hint}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Command menu</dt>
            <dd><kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">Ctrl/⌘ K</kbd></dd>
            <dt className="text-muted-foreground">New chat</dt>
            <dd><kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">C</kbd></dd>
            {PAGES.map((p) => (
              <div key={p.id} className="contents">
                <dt className="text-muted-foreground">Go to {p.label}</dt>
                <dd><kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">{p.hint}</kbd></dd>
              </div>
            ))}
            <dt className="text-muted-foreground">Show this list</dt>
            <dd><kbd className="rounded border px-1.5 py-0.5 font-mono text-xs">?</kbd></dd>
          </dl>
        </DialogContent>
      </Dialog>
    </>
  );
}
