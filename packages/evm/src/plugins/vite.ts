/**
 * trezoVitePlugin()
 *
 * Add to your Vite config to prevent duplicate React / React-DOM instances
 * when using @trezo/evm alongside other packages that depend on React.
 *
 * @example
 * // vite.config.ts
 * import { trezoVitePlugin } from "@trezo/evm/plugins/vite";
 *
 * export default defineConfig({
 *   plugins: [trezoVitePlugin()],
 * });
 */
export function trezoVitePlugin() {
  return {
    name: "trezo-evm",
    config(config: any) {
      config.resolve = config.resolve ?? {};
      config.resolve.dedupe = [
        ...(config.resolve.dedupe ?? []),
        "react",
        "react-dom",
        "react/jsx-runtime",
        "wagmi",
        "viem",
        "@tanstack/react-query",
      ];
      return config;
    },
  };
}
