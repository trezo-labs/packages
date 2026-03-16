import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/trezo.ts"],
  format: ["cjs", "esm"],
  dts: true,
  clean: true,
  external: ["react", "react-dom"],
  sourcemap: false,
  target: "es2022",
});
