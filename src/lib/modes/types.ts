export type ModeKey = "slides" | "document" | "sheet" | "deep-research";

export type SlidePurpose =
  | "hook" | "context" | "problem" | "proof" | "detail"
  | "comparison" | "turn" | "insight" | "evidence" | "solution"
  | "mechanism" | "result" | "close";

export type SlideDensity = "sparse" | "balanced" | "dense";

export type LayoutShell = "contained" | "bleed" | "split" | "overlap";

export interface SlideLayout {
  family?: string;
  variant?: string;
  shell?: LayoutShell;
  /** Asymmetric media/text ratio (0.3–0.7). Only meaningful for split shells. */
  ratio?: number;
}

export type VisualNeed = "none" | "photo" | "diagram" | "chart" | "icon" | "texture";

export interface SlideVisual {
  need?: VisualNeed;
  /** Semantic direction: what visual communicates this slide's message. */
  concept?: string;
  /** Stock-search query or generation prompt. */
  query?: string;
  /** Resolved asset id (Attachment) or URL. */
  assetId?: string;
  crop?: { x: number; y: number; w: number; h: number };
  role?: "background" | "side" | "full" | "thumb";
}

export interface ArtifactBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: ArtifactBlock[];
  style?: BlockStyle;
  /** Design-intent fields (all optional; absent = legacy behavior). */
  purpose?: SlidePurpose;
  /** Single-sentence takeaway — drives hierarchy, not rendered directly. */
  message?: string;
  density?: SlideDensity;
  layout?: SlideLayout;
  visual?: SlideVisual;
}

export interface BlockStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  backgroundColor?: string;
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  borderRadius?: number;
  border?: boolean;
  shadow?: boolean;
  /** Mouse-dragged placement offsets (px) for free positioning inside the slide. */
  offsetX?: number;
  offsetY?: number;
}

export interface Artifact {
  title: string;
  theme?: string;
  /** Full custom theme override (created in the theme builder). Persisted with the deck. */
  themeConfig?: Record<string, unknown>;
  blocks: ArtifactBlock[];
}

export interface BlockProperty {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "list" | "object-list" | "color";
  options?: string[];
  placeholder?: string;
  /** Field descriptors for object-list items (e.g. timeline milestones). */
  itemFields?: Array<{ key: string; label: string; placeholder?: string }>;
}

export interface BlockTypeDef {
  type: string;
  label: string;
  defaultProps: Record<string, unknown>;
  properties: BlockProperty[];
}

export interface ModeTemplate {
  id: string;
  label: string;
  description: string;
  prompt: string;
  /** Existing deck theme applied before the first generated block renders. */
  theme?: string;
  /** A concise visual brief passed to the generator with the user's content. */
  designDirection?: string;
}

export interface ModeDefinition {
  mode: ModeKey;
  label: string;
  blockTypes: BlockTypeDef[];
  templates: ModeTemplate[];
}

export const MODE_ROUTES: Record<ModeKey, string> = {
  slides: "/slides",
  document: "/document",
  sheet: "/sheet",
  "deep-research": "/deep-research",
};

export function makeId(prefix = "blk"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
