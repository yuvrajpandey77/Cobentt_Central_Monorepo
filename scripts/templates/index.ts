import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TEMPLATES, REGISTRY_VERSION } from "@/lib/templates";

/**
 * Generate the optimized registry/index artifact from the typed TS source
 * (single source of truth). Output: data/presentation-templates/registry.json
 */
async function main() {
  const out = {
    version: REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),
    count: TEMPLATES.length,
    templates: TEMPLATES,
  };
  const dir = join(process.cwd(), "data", "presentation-templates");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "registry.json");
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Wrote ${file} (${TEMPLATES.length} templates)`);
}

main();
