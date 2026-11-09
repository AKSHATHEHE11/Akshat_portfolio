import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // This project does not use the React Compiler. These compiler-oriented rules misfire on
    // standard GSAP (contextSafe, quickTo) and three.js/R3F patterns (mutating objects in useFrame),
    // so they are advisory here. rules-of-hooks / set-state-in-render stay errors.
    rules: {
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/globals": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".locks/**",
  ]),
]);

export default eslintConfig;
