export function trezoStrkVitePlugin() {
  return {
    name: "trezo-strk",
    config(config: any) {
      config.resolve = config.resolve ?? {};
      config.resolve.dedupe = [
        ...(config.resolve.dedupe ?? []),
        "react",
        "react-dom",
        "react/jsx-runtime",
        "starknet",
        "@starknet-react/core",
        "@starknet-react/chains",
      ];
      return config;
    },
  };
}
