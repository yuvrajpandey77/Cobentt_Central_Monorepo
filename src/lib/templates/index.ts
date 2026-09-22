/**
 * Template Intelligence Layer — public surface.
 * Disabled entirely when TEMPLATE_INTELLIGENCE_ENABLED=false
 * (existing generation behavior is then byte-identical).
 */
export * from "./types";
export { TEMPLATES, REGISTRY_VERSION, getTemplate } from "./registry";
export { validateRegistry } from "./validator";
export { scoreTemplate } from "./scorer";
export { retrieveTemplates, compatibilityScore } from "./retriever";
export {
  emptyUsage,
  selectDirection,
  selectForSlide,
  elementTreatment,
  buildTemplateContext,
  visualIntentToCategories,
  stylePresetToCategories,
  familyToPattern,
  contentTypesForFamily,
} from "./selector";
export { normalizeTemplate, getLayouts, adaptToBrand } from "./adapter";
export { analyzeCss } from "./analyzer";

export function templateIntelligenceEnabled(): boolean {
  return process.env.TEMPLATE_INTELLIGENCE_ENABLED !== "false";
}
