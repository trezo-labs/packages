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
      ];
      return config;
    },
  };
}
