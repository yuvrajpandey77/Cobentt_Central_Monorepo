// Dynamic slide theme system.
// Each theme is a full visual recipe — not just a background color:
// gradient field, pattern overlay, fonts, card treatment, radius.

export type SlideBackdrop =
  | "mesh"
  | "aurora"
  | "grid"
  | "dots"
  | "lines"
  | "diagonal"
  | "paper"
  | "solid";

export interface DynamicSlideTheme {
  id: string;
  label: string;
  description: string;
  dark: boolean;
  bg: string;
  bg2: string;
  accent: string;
  accent2: string;
  text: string;
  muted: string;
  chip: string;
  fontHeading: string;
  fontBody: string;
  backdrop: SlideBackdrop;
  radius: number;
  custom?: boolean;
}

export const SLIDE_FONTS = [
  "Inter",
  "Sora",
  "Space Grotesk",
  "Fraunces",
  "Playfair Display",
  "DM Serif Display",
  "Outfit",
  "Manrope",
  "IBM Plex Sans",
  "JetBrains Mono",
  "Georgia",
];

export const SLIDE_BACKDROPS: Array<{ id: SlideBackdrop; label: string }> = [
  { id: "mesh", label: "Mesh glow" },
  { id: "aurora", label: "Aurora" },
  { id: "grid", label: "Blueprint grid" },
  { id: "dots", label: "Dot field" },
  { id: "lines", label: "Fine lines" },
  { id: "diagonal", label: "Diagonal cut" },
  { id: "paper", label: "Paper grain" },
  { id: "solid", label: "Flat solid" },
];

export const DYNAMIC_SLIDE_THEMES: DynamicSlideTheme[] = [
  {
    id: "midnight", label: "Midnight Signal", description: "Cinematic dark canvas, electric-blue mesh, oversized type.",
    dark: true, bg: "#0b1220", bg2: "#111c33", accent: "#38bdf8", accent2: "#818cf8",
    text: "#f1f5f9", muted: "#94a3b8", chip: "#0ea5e9",
    fontHeading: "Sora", fontBody: "Inter", backdrop: "mesh", radius: 16,
  },
  {
    id: "royal", label: "Aurora Royal", description: "Luminous violet aurora over deep indigo. Premium reveal pacing.",
    dark: true, bg: "#1e1b4b", bg2: "#312e81", accent: "#a78bfa", accent2: "#22d3ee",
    text: "#faf5ff", muted: "#c4b5fd", chip: "#8b5cf6",
    fontHeading: "Space Grotesk", fontBody: "Inter", backdrop: "aurora", radius: 18,
  },
  {
    id: "emerald", label: "Emerald Ops", description: "Deep green field with mint glow. Calm, operational, confident.",
    dark: true, bg: "#022c22", bg2: "#064e3b", accent: "#34d399", accent2: "#a3e635",
    text: "#ecfdf5", muted: "#6ee7b7", chip: "#10b981",
    fontHeading: "Sora", fontBody: "Inter", backdrop: "dots", radius: 14,
  },
  {
    id: "sunset", label: "Neo Memphis", description: "Playful geometric sunset. High energy launch decks.",
    dark: true, bg: "#2a0a1a", bg2: "#4c1d3f", accent: "#fb923c", accent2: "#f472b6",
    text: "#fff7ed", muted: "#fdba74", chip: "#f97316",
    fontHeading: "Outfit", fontBody: "Manrope", backdrop: "diagonal", radius: 20,
  },
  {
    id: "ocean", label: "Signal Blue", description: "Editorial data-storytelling. Large metrics, deliberate space.",
    dark: true, bg: "#082f49", bg2: "#0c4a6e", accent: "#22d3ee", accent2: "#38bdf8",
    text: "#ecfeff", muted: "#67e8f9", chip: "#06b6d4",
    fontHeading: "Space Grotesk", fontBody: "IBM Plex Sans", backdrop: "grid", radius: 12,
  },
  {
    id: "ink", label: "Editorial Ink", description: "Black ink on soft paper. Asymmetric type, gallery whitespace.",
    dark: false, bg: "#faf9f6", bg2: "#f1ede4", accent: "#171717", accent2: "#b45309",
    text: "#171717", muted: "#57534e", chip: "#44403c",
    fontHeading: "Fraunces", fontBody: "Georgia", backdrop: "paper", radius: 10,
  },
  {
    id: "crimson", label: "Brutalist Pop", description: "Raw poster energy. Huge type, hard geometry, loud contrast.",
    dark: true, bg: "#2a0d0d", bg2: "#450a0a", accent: "#f9a8d4", accent2: "#fb7185",
    text: "#fff1f2", muted: "#fda4af", chip: "#f43f5e",
    fontHeading: "Outfit", fontBody: "Inter", backdrop: "lines", radius: 6,
  },
  {
    id: "midnight-black", label: "Monograph", description: "Striking monochrome. One idea per slide, gallery calm.",
    dark: true, bg: "#0a0a0a", bg2: "#1c1c1e", accent: "#f5f5f5", accent2: "#a3a3a3",
    text: "#ffffff", muted: "#a3a3a3", chip: "#d4d4d4",
    fontHeading: "DM Serif Display", fontBody: "Inter", backdrop: "solid", radius: 8,
  },
  {
    id: "forest", label: "Field Notes", description: "Grounded research style. Evidence-forward, source-conscious.",
    dark: true, bg: "#04130b", bg2: "#14532d", accent: "#fde047", accent2: "#86efac",
    text: "#ecfdf5", muted: "#86efac", chip: "#65a30d",
    fontHeading: "Fraunces", fontBody: "IBM Plex Sans", backdrop: "dots", radius: 14,
  },
  {
    id: "berry", label: "Glass Violet", description: "Dark glassmorphism, violet highlights, soft depth.",
    dark: true, bg: "#15002b", bg2: "#2e1065", accent: "#22d3ee", accent2: "#e879f9",
    text: "#fdf4ff", muted: "#d8b4fe", chip: "#d946ef",
    fontHeading: "Sora", fontBody: "Inter", backdrop: "mesh", radius: 22,
  },
  {
    id: "slate-light", label: "Blueprint", description: "Crisp light surface, cobalt accents, technical clarity.",
    dark: false, bg: "#f8fafc", bg2: "#e2e8f0", accent: "#1d4ed8", accent2: "#0ea5e9",
    text: "#0f172a", muted: "#64748b", chip: "#3b82f6",
    fontHeading: "Space Grotesk", fontBody: "IBM Plex Sans", backdrop: "grid", radius: 12,
  },
  {
    id: "sand", label: "Atelier Gold", description: "Quiet luxury. Precise type, generous negative space.",
    dark: true, bg: "#1c1305", bg2: "#3b2a0b", accent: "#fbbf24", accent2: "#f59e0b",
    text: "#fef3c7", muted: "#fde68a", chip: "#d97706",
    fontHeading: "Playfair Display", fontBody: "Manrope", backdrop: "paper", radius: 12,
  },
];

function hexToRgba(hex: string, alpha: number): string {
  let h = (hex || "#000000").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const num = parseInt(h || "000000", 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getSlideTheme(id?: string, custom?: Partial<DynamicSlideTheme> | null): DynamicSlideTheme {
  const base = DYNAMIC_SLIDE_THEMES.find((t) => t.id === id) ?? DYNAMIC_SLIDE_THEMES[0];
  if (!custom) return base;
  return { ...base, ...custom, id: custom.id ?? `custom-${Date.now().toString(36)}`, label: custom.label ?? "Custom", custom: true };
}

/** Full-bleed slide background honoring the theme's backdrop recipe. */
export function slideBackgroundStyle(theme: DynamicSlideTheme): React.CSSProperties {
  const glowA = hexToRgba(theme.accent, 0.22);
  const glowB = hexToRgba(theme.accent2, 0.2);
  const base = `linear-gradient(135deg, ${theme.bg} 0%, ${theme.bg2} 100%)`;

  switch (theme.backdrop) {
    case "mesh":
      return {
        background: `radial-gradient(120% 120% at 12% 8%, ${glowA} 0%, transparent 46%), radial-gradient(100% 110% at 95% 95%, ${glowB} 0%, transparent 52%), ${base}`,
      };
    case "aurora":
      return {
        background: `radial-gradient(90% 70% at 50% -10%, ${glowA} 0%, transparent 60%), radial-gradient(70% 90% at 85% 110%, ${glowB} 0%, transparent 55%), radial-gradient(60% 60% at 8% 90%, ${hexToRgba(theme.chip, 0.25)} 0%, transparent 55%), ${base}`,
      };
    case "grid":
      return {
        background: `${base}`,
        backgroundImage: `linear-gradient(${hexToRgba(theme.accent, 0.1)} 1px, transparent 1px), linear-gradient(90deg, ${hexToRgba(theme.accent, 0.1)} 1px, transparent 1px), radial-gradient(90% 90% at 80% 10%, ${glowA} 0%, transparent 55%), ${base}`,
        backgroundSize: "44px 44px, 44px 44px, cover, cover",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${hexToRgba(theme.accent, 0.22)} 1.2px, transparent 1.2px), radial-gradient(100% 100% at 100% 0%, ${glowB} 0%, transparent 50%), ${base}`,
        backgroundSize: "22px 22px, cover, cover",
      };
    case "lines":
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${hexToRgba(theme.accent, 0.08)} 0 1px, transparent 1px 14px), radial-gradient(80% 90% at 15% 15%, ${glowA} 0%, transparent 55%), ${base}`,
      };
    case "diagonal":
      return {
        background: `linear-gradient(115deg, ${hexToRgba(theme.accent, 0.28)} 0%, transparent 32%), linear-gradient(115deg, transparent 62%, ${hexToRgba(theme.accent2, 0.25)} 100%), ${base}`,
      };
    case "paper":
      return {
        background: `radial-gradient(120% 100% at 50% 0%, rgba(255,255,255,${theme.dark ? 0.06 : 0.5}) 0%, transparent 60%), repeating-linear-gradient(0deg, ${theme.dark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.03)"} 0 1px, transparent 1px 5px), ${base}`,
      };
    case "solid":
    default:
      return { background: theme.bg };
  }
}

export function themeCardStyle(theme: DynamicSlideTheme): React.CSSProperties {
  return {
    background: hexToRgba(theme.dark ? "#ffffff" : "#0f172a", theme.dark ? 0.05 : 0.04),
    border: `1px solid ${hexToRgba(theme.accent, 0.25)}`,
    borderRadius: theme.radius,
  };
}

export interface SlidesSetup {
  slideCount?: number;
  themeId?: string;
  themeConfig?: Partial<DynamicSlideTheme> | null;
  audience?: string;
  goal?: string;
  useSourceImages?: boolean;
}

/** Machine-readable setup block embedded by the launchpad/setup page.
 *  Format:
 *  [SLIDES_SETUP]{...json...}[/SLIDES_SETUP]
 *  Parsed server-side so custom themes + exact page counts survive
 *  without a DB migration. */
export function parseSlidesSetup(message: string): { cleanMessage: string; setup: SlidesSetup } {
  const match = message.match(/\[SLIDES_SETUP\]([\s\S]*?)\[\/SLIDES_SETUP\]/);
  if (!match) return { cleanMessage: message, setup: {} };
  try {
    const setup = JSON.parse(match[1].trim()) as SlidesSetup;
    const cleanMessage = message.replace(match[0], "").trim();
    if (setup.slideCount) {
      setup.slideCount = Math.max(3, Math.min(30, Math.round(Number(setup.slideCount) || 10)));
    }
    return { cleanMessage, setup };
  } catch {
    return { cleanMessage: message.replace(match[0], "").trim(), setup: {} };
  }
}

export function buildSlidesSetupBlock(setup: SlidesSetup): string {
  return `[SLIDES_SETUP]${JSON.stringify(setup)}[/SLIDES_SETUP]`;
}

/** Legacy 6-field palette for pptx / older consumers. */
export function toLegacyPalette(theme: DynamicSlideTheme): { bg: string; accent: string; text: string; muted: string; chip: string } {
  return { bg: theme.bg, accent: theme.accent, text: theme.text, muted: theme.muted, chip: theme.chip };
}
