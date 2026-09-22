import { TEMPLATES, REGISTRY_VERSION } from "@/lib/templates";

async function main() {
  console.log(`Template registry v${REGISTRY_VERSION} — ${TEMPLATES.length} visual systems\n`);
  for (const t of TEMPLATES) {
    console.log(
      `${t.id} — ${t.name} [${t.source.type}${t.source.license ? `, ${t.source.license}` : ""}]`
    );
    console.log(`  categories: ${t.categories.join(", ")}`);
    console.log(`  theme: ${t.appMapping.themeId} | layouts: ${t.appMapping.layoutBoost.join(", ")}`);
    console.log(`  best for: ${t.bestFor.slice(0, 3).join("; ")}`);
  }
}

main();
