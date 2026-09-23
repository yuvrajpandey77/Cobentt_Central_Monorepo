import { getSlideTheme } from "@/lib/modes/slide-themes";
import { getTemplate } from "./registry";
import type {
  BrandVisualContext,
  PresentationTemplate,
  SlideLayout,
} from "./types";

export interface NormalizedTemplate {
  template: PresentationTemplate;
  /** Renderable dynamic theme id (guaranteed to exist). */
  themeId: string;
  /** Layout families reinforced for this system. */
  layouts: string[];
  /** Element treatment hint for the composer. */
  treatment: string;
}

/**
 * TemplateAdapter: template-specific concepts → app-normalized system.
 * A template never bypasses the renderer — it resolves to a dynamic theme
 * + layout affinities the existing canvas/exporters already draw.
 */
export function normalizeTemplate(template: PresentationTemplate): NormalizedTemplate {
  let themeId = template.appMapping.themeId;
  try {
    getSlideTheme(themeId, null);
  } catch {
    themeId = "midnight";
  }
  return {
    template,
    themeId,
    layouts: [...template.appMapping.layoutBoost],
    treatment: template.appMapping.accentTreatment ?? "rule",
  };
}

export function getLayouts(templateId: string): SlideLayout[] {
  const t = getTemplate(templateId);
  if (!t) return [];
  return t.appMapping.layoutBoost.map((family) => ({ family }));
}

/**
 * Brand adaptation: keep the system's grammar, shift its tokens toward the
 * user's brand (§19). Returns a themeConfig override or null when no brand.
 */
export function adaptToBrand(
  templateId: string,
  brand: BrandVisualContext | null | undefined
): Record<string, unknown> | null {
  if (!brand) return null;
  const t = getTemplate(templateId);
  const base = t ? getSlideTheme(t.appMapping.themeId, null) : getSlideTheme("midnight", null);
  const cfg: Record<string, unknown> = { id: "brand", label: `${t?.name ?? "Custom"} + brand`, custom: true };
  if (brand.primaryColor) cfg.bg = brand.primaryColor;
  if (brand.accentColor) { cfg.accent = brand.accentColor; cfg.chip = brand.accentColor; }
  if (brand.secondaryColor) cfg.bg2 = brand.secondaryColor;
  if (brand.fontFamily) { cfg.fontHeading = brand.fontFamily; }
  if (typeof brand.borderRadius === "number") cfg.radius = brand.borderRadius;
  if (typeof brand.darkMode === "boolean") cfg.dark = brand.darkMode;
  // Grammar preserved: backdrop + body font stay with the system.
  cfg.backdrop = base.backdrop;
  cfg.fontBody = base.fontBody;
  cfg.text = base.text;
  cfg.muted = base.muted;
  return cfg;
}
