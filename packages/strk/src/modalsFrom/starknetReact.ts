import { argent, braavos, Connector } from "@starknet-react/core";

export type RecommendedConnectorName = "argent" | "braavos";

export const connectorMap: Record<RecommendedConnectorName, () => Connector> = {
  argent,
  braavos,
};

export type StarknetReactConfigType = {
  recommended?: RecommendedConnectorName[];
  connectors?: Connector[];
  includeRecommended?: "always" | "onlyIfNoConnectors" | undefined;
};
