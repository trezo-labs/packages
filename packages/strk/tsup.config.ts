import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "plugins/vite": "src/plugins/vite.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  external: ["react", "react-dom", "react/jsx-runtime"],
  noExternal: [
    "starknet",
    "starknetkit",
    "@starknet-react/core",
    "@starknet-react/chains",
    "@starknet-io/get-starknet-core",
  ],
  treeshake: true,
  sourcemap: true,
  clean: true,
});
