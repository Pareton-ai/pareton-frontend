import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

/** Ban arbitrary Tailwind type utilities; use named tokens in globals.css. */
const noArbitraryTypeUtilities = [
  "error",
  {
    selector: "Literal[value=/(?:^|[\\s\"'`])(?:text|tracking|leading)-\\[/]",
    message:
      "Use named type-scale tokens from globals.css (e.g. text-body, tracking-eyebrow, leading-body-loose) instead of arbitrary values.",
  },
  {
    selector:
      "TemplateElement[value.raw=/(?:^|[\\s\"'`])(?:text|tracking|leading)-\\[/]",
    message:
      "Use named type-scale tokens from globals.css (e.g. text-body, tracking-eyebrow, leading-body-loose) instead of arbitrary values.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-syntax": noArbitraryTypeUtilities,
    },
  },
  eslintConfigPrettier,
]);

export default eslintConfig;
