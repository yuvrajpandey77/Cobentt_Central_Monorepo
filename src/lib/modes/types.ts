export type ModeKey = "slides" | "document" | "sheet" | "deep-research";

export interface ArtifactBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: ArtifactBlock[];
  style?: BlockStyle;
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
}

export interface Artifact {
  title: string;
  theme?: string;
  blocks: ArtifactBlock[];
}

export interface BlockProperty {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "list" | "color";
  options?: string[];
  placeholder?: string;
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
