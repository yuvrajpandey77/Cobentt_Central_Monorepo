export type ModeKey = "slides" | "document" | "sheet" | "deep-research";

export interface ArtifactBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children?: ArtifactBlock[];
}

export interface Artifact {
  title: string;
  theme?: string;
  blocks: ArtifactBlock[];
}

export interface BlockProperty {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "list";
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
