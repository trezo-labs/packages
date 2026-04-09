import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    // ── Core ────────────────────────────────────────────────────────
    index: "src/index.ts",

    // ── Framework adapters ──────────────────────────────────────────
    react: "src/adapters/react/index.ts",

    // ── Vite plugin ─────────────────────────────────────────────────
    "plugins/vite": "src/plugins/vite.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  external: [
    // Peer deps — never bundle
    "react",
    "react-dom",
    "react/jsx-runtime",
    // Framework peers
    "vue",
    "svelte",
    "svelte/store",
    "@angular/core",
    "@angular/common",
    "rxjs",
    "rxjs/operators",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
  // Keep each framework adapter tree-shakeable
  splitting: true,
});
