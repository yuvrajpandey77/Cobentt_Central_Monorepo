import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "**/.next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Separate nested Next.js project — has its own package.json + eslint
      // config. Lint it from within cobentt_landing/, not from the root.
      "cobentt_landing/**",
      // Generated Prisma client (also gitignored) — never hand-lint output.
      "src/generated/**",
    ],
  },
];

export default eslintConfig;
