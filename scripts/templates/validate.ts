import { TEMPLATES, validateRegistry } from "@/lib/templates";

async function main() {
  const result = validateRegistry(TEMPLATES);
  console.log(`Registry: ${TEMPLATES.length} templates`);
  for (const w of result.warnings) console.log(`WARN: ${w}`);
  if (!result.valid) {
    for (const e of result.errors) console.log(`ERROR: ${e}`);
    process.exit(1);
  }
  console.log("VALID: schema, ids, categories, layouts, themes, licenses all check out.");
}

main();
