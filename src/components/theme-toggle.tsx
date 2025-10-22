"use client";

import { useTheme as useNextTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useNextTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const activeTheme = theme === "system" ? systemTheme : theme;

  if (!mounted) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 backdrop-blur px-2 py-1 shadow-lg">
      <button
        aria-label="Light mode"
        onClick={() => setTheme("light")}
        className={`h-8 w-8 grid place-items-center rounded-full transition-colors ${
          activeTheme === "light" ? "bg-white text-black" : "hover:bg-white/10 text-white/80"
        }`}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        aria-label="Dark mode"
        onClick={() => setTheme("dark")}
        className={`h-8 w-8 grid place-items-center rounded-full transition-colors ${
          activeTheme === "dark" ? "bg-white text-black" : "hover:bg-white/10 text-white/80"
        }`}
      >
        <Moon className="h-4 w-4" />
      </button>
    </div>
  );
}


