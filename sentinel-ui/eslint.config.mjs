import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Lint gate for the console.
 *
 * `eslint-config-next` still ships the legacy (eslintrc) format, so it is
 * bridged through `FlatCompat`; eslint 9 only reads flat config. The rule set
 * is Next's own: core web vitals plus the TypeScript flavour, which is what
 * catches unused imports, floating promises and hook-dependency mistakes
 * before they reach a build.
 */
const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    // Build output, dependencies and the recorded demo bundle are not source.
    ignores: [".next/**", "node_modules/**", "public/demo/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default config;
