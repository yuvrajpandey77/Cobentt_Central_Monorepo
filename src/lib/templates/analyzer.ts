/**
 * Template analyzer (§8): inspects raw HTML/CSS sources and extracts
 * normalized visual identity + layout primitives. Used by the
 * `templates:analyze` CLI when ingesting a legally-reusable source;
 * runtime selection operates on cached registry metadata, never raw CSS.
 */

export interface AnalyzedTokens {
  colors: string[];
  fontFamilies: string[];
  fontSizes: number[];
  fontWeights: number[];
  radii: number[];
  shadows: number;
  backgroundTreatment: Array<"solid" | "gradient" | "image" | "pattern">;
  alignment: Array<"left" | "center" | "right">;
  detectedPatterns: string[];
  motion: string[];
}

const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
const FONT_RE = /font-family\s*:\s*([^;}{]+)/gi;
const SIZE_RE = /font-size\s*:\s*([\d.]+)px/gi;
const WEIGHT_RE = /font-weight\s*:\s*(\d{3}|bold|normal)/gi;
const RADIUS_RE = /border-radius\s*:\s*([\d.]+)px/gi;

const PATTERN_HINTS: Array<[string, RegExp]> = [
  ["hero", /hero|jumbotron|cover/i],
  ["split", /split|50[\/-]50|half/i],
  ["two-column", /two-col|col-6|grid-cols-2/i],
  ["three-column", /three-col|col-4|grid-cols-3/i],
  ["grid", /grid|tiles/i],
  ["metric-grid", /metric|stat|kpi/i],
  ["comparison", /compar|versus|\bvs\b/i],
  ["timeline", /timeline|milestone/i],
  ["process", /process|steps|workflow/i],
  ["quote", /quote|testimonial|blockquote/i],
  ["image-text", /image.*text|text.*image|media/i],
  ["chart", /chart|graph|plot/i],
  ["table", /table/i],
  ["diagram", /diagram|flowchart|mermaid/i],
  ["code", /code|```|pre\b/i],
  ["closing", /thank|contact|cta/i],
  ["section-divider", /divider|section-break/i],
];

export function analyzeCss(source: string): AnalyzedTokens {
  const colors = [...new Set((source.match(HEX_RE) ?? []).map((c) => c.toLowerCase()))].slice(0, 24);
  const fontFamilies = [...new Set(
    [...source.matchAll(FONT_RE)].flatMap((m) =>
      m[1].split(",").map((f) => f.trim().replace(/["']/g, "")).filter(Boolean)
    )
  )].slice(0, 12);
  const fontSizes = [...new Set([...source.matchAll(SIZE_RE)].map((m) => Math.round(Number(m[1]))))].sort((a, b) => a - b).slice(0, 12);
  const fontWeights = [...new Set([...source.matchAll(WEIGHT_RE)].map((m) => (m[1] === "bold" ? 700 : m[1] === "normal" ? 400 : Number(m[1]))))];
  const radii = [...new Set([...source.matchAll(RADIUS_RE)].map((m) => Number(m[1])))].slice(0, 8);
  const shadows = (source.match(/box-shadow/gi) ?? []).length;
  const backgroundTreatment: AnalyzedTokens["backgroundTreatment"] = [];
  if (/linear-gradient|radial-gradient/i.test(source)) backgroundTreatment.push("gradient");
  if (/background(-image)?\s*:\s*url/i.test(source)) backgroundTreatment.push("image");
  if (/repeating-|background-size|dot|grid/i.test(source)) backgroundTreatment.push("pattern");
  if (backgroundTreatment.length === 0) backgroundTreatment.push("solid");
  const alignment: AnalyzedTokens["alignment"] = [];
  if (/text-align\s*:\s*left/i.test(source)) alignment.push("left");
  if (/text-align\s*:\s*center/i.test(source)) alignment.push("center");
  if (/text-align\s*:\s*right/i.test(source)) alignment.push("right");
  const detectedPatterns = PATTERN_HINTS.filter(([, re]) => re.test(source)).map(([name]) => name);
  const motion: string[] = [];
  if (/transition/i.test(source)) motion.push("fade");
  if (/translate|slide/i.test(source)) motion.push("slide");
  if (/scale\(|transform/i.test(source)) motion.push("scale");
  if (/stagger|nth-child|animation-delay/i.test(source)) motion.push("stagger");
  return { colors, fontFamilies, fontSizes, fontWeights, radii, shadows, backgroundTreatment, alignment, detectedPatterns, motion };
}
