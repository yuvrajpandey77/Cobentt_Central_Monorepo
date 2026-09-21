"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface DocIndexItem {
  path: string;
  title: string;
  excerpt: string;
}

export default function SearchBox({ index }: { index: DocIndexItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // close results on route change
    setOpen(false);
    setActive(0);
  }, [pathname]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [] as DocIndexItem[];
    return index
      .filter((i) =>
        i.title.toLowerCase().includes(query) || i.excerpt.toLowerCase().includes(query)
      )
      .slice(0, 8);
  }, [q, index]);

  return (
    <div className="relative" onKeyDown={(e) => {
      if (!open && (e.key === "ArrowDown" || e.key === "Enter")) setOpen(true);
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        const r = results[active];
        if (r) router.push(`/docs?file=${encodeURIComponent(r.path)}`);
        setOpen(false);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => { if (q.trim()) setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 100)}
        placeholder="Search documentation…"
        className="w-full h-9 pl-9 pr-3 rounded-md bg-white/5 border border-white/10 text-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#00AEEF]/40"
      />
      {open && results.length > 0 && (
        <div className="absolute mt-2 w-full rounded-lg border border-white/20 bg-[#0f1115]/95 text-white backdrop-blur-lg shadow-2xl p-2 z-50">
          {results.map((r, i) => (
            <Link
              key={r.path}
              href={{ pathname: "/docs", query: { file: r.path } }}
              prefetch
              className={`block rounded-md px-3 py-2 hover:bg-white/10 focus:bg-white/10 ${i === active ? "bg-white/10" : ""}`}
            >
              <div className="text-sm font-medium text-white">{r.title}</div>
              <div className="text-xs text-text-secondary line-clamp-1">{r.excerpt}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}


