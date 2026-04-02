export function trezoVitePlugin() {
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
        "starknetkit",
        "@starknet-react/core",
        "@starknet-react/chains",
        "@starknet-io/get-starknet-core",
      ];
      return config;
    },
  };
}

export default trezoVitePlugin;
