import type {
  LayoutShell,
  SlideDensity,
  SlideLayout,
  SlidePurpose,
  SlideVisual,
  VisualNeed,
} from "@/lib/modes/types";

export type { LayoutShell, SlideDensity, SlideLayout, SlidePurpose, SlideVisual, VisualNeed };

export type TemplateCategory =
  | "startup" | "investor" | "corporate" | "editorial" | "minimal"
  | "technical" | "academic" | "research" | "creative" | "agency"
  | "brutalist" | "playful" | "luxury" | "institutional" | "data-heavy"
  | "product" | "marketing" | "portfolio" | "experimental" | "nostalgic";

export type LayoutPattern =
  | "hero" | "statement" | "split" | "two-column" | "three-column"
  | "grid" | "metric-grid" | "comparison" | "timeline" | "process"
  | "quote" | "case-study" | "image-text" | "chart" | "table"
  | "diagram" | "architecture" | "code" | "section-divider" | "closing";

export type TemplateSourceType = "github" | "local" | "generated" | "reference";

export interface PresentationTemplate {
  id: string;
  name: string;
  version: string;
  source: {
    type: TemplateSourceType;
    url?: string;
    repository?: string;
    license?: string;
  };
  categories: TemplateCategory[];
  visualStyle: {
    mood: string[];
    energy: "low" | "medium" | "high";
    density: "low" | "medium" | "high";
    minimalism: number;
    editorial: number;
    corporate: number;
    playful: number;
    technical: number;
    experimental: number;
  };
  typography: {
    headingStyle: string;
    bodyStyle: string;
    numericStyle?: string;
    alignment: "left" | "center" | "mixed";
    hierarchy: "subtle" | "moderate" | "strong";
  };
  colorSystem: {
    background: string[];
    foreground: string[];
    accent: string[];
    surface?: string[];
    contrast: "low" | "medium" | "high";
  };
  layoutPatterns: LayoutPattern[];
  supportedSlidePurposes: SlidePurpose[];
  visualNeeds: VisualNeed[];
  preferredContentDensity: SlideDensity[];
  supportedAspectRatios: string[];
  animation?: { supported: boolean; style?: string[] };
  characteristics: string[];
  bestFor: string[];
  avoidFor?: string[];
  /** Free-text design lineage (no copied code). */
  inspiredBy?: string[];
  tags: string[];
  preview?: string;
  /** Renderable mapping into this app's dynamic theme system. */
  appMapping: {
    /** Must be an id in DYNAMIC_SLIDE_THEMES. */
    themeId: string;
    /** Layout families this system expresses best (existing registry ids). */
    layoutBoost: string[];
    /** Optional accent treatment hint for element-level styling. */
    accentTreatment?: "rule" | "badge" | "wash" | "outline";
  };
  /** Ids of systems this one combines cleanly with. */
  compatibleWith?: string[];
  /** Reserved for future semantic retrieval (§33). */
  embedding?: number[];
  /** Reserved for future screenshot intelligence (§34). */
  visualFingerprint?: {
    dominantColors?: string[];
    composition?: string[];
    imageRatio?: number;
    textRatio?: number;
    whitespaceRatio?: number;
  };
}

export type SlideContentType =
  | "text" | "numbers" | "image" | "chart"
  | "table" | "diagram" | "code" | "quote";

export interface TemplateSelectionContext {
  presentationType?: string;
  audience?: string;
  industry?: string;
  tone?: string;
  brandStyle?: string;
  slidePurpose: SlidePurpose;
  density: SlideDensity;
  layout?: SlideLayout;
  visualNeed?: VisualNeed;
  contentTypes: SlideContentType[];
  preferredCategories?: TemplateCategory[];
  excludedCategories?: TemplateCategory[];
  aspectRatio?: string;
  previousTemplateIds?: string[];
}

export interface ScoredTemplate {
  template: PresentationTemplate;
  score: number;
  reasons: string[];
}

export interface TemplateUsageState {
  usedTemplates: string[];
  usedLayouts: string[];
  usedVisualPatterns: string[];
}

export interface PresentationDirection {
  primary: PresentationTemplate;
  secondaries: PresentationTemplate[];
  rationale: string[];
}

export interface BrandVisualContext {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  borderRadius?: number;
  visualTone?: string;
  darkMode?: boolean;
  lightMode?: boolean;
}

export interface ElementTreatment {
  typography: string;
  cards: string;
  metrics: string;
  images: string;
  diagrams: string;
  charts: string;
  borders: string;
  accent: string;
  spacing: string;
}
