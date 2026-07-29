"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Theme = "dark" | "light";

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  textScale: number;
  setTextScale: (s: number) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: "dark", toggle: () => {}, setTheme: () => {},
  textScale: 1, setTextScale: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>("dark");
  const [textScale, setTextScaleState] = useState(1);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => {}, setTheme: () => {}, textScale, setTextScale: setTextScaleState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
