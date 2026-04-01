import React from "react";
import {
  StarknetConfig,
  useInjectedConnectors,
  voyager,
  jsonRpcProvider,
  useAccount,
  useConnect,
  useDisconnect,
  Connector,
} from "@starknet-react/core";
import { ModalConfigType } from "@/src/types/modal.type";
import { StarknetChains } from "@/src/types/config.type";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import { CommonButtonRenderProps } from "@/src/types/button.type";
import { ModalInstance } from "@/src/create";
import {
  connectorMap,
  RecommendedConnectorName,
} from "@/src/modalsFrom/starknetReact";

type ButtonRenderProps = CommonButtonRenderProps & {
  connectors?: Connector[];
};

export type ButtonProps = {
  label?: string;
  children?: (props: ButtonRenderProps) => React.ReactNode;
};

function ConnectButtonInner({ children }: ButtonProps) {
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const truncatedAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : undefined;

  const open = async (connectorId?: string) => {
    const connector =
      connectors.find((c) => c.id === connectorId) ?? connectors[0];

    if (connector) {
      await connectAsync({ connector });
    }
  };

  const close = async () => await disconnectAsync();

  const renderProps: ButtonRenderProps = {
    isConnected: isConnected ?? false,
    isConnecting: isPending,
    address,
    truncatedAddress,
    chainId: chainId?.toString(),
    open,
    close,
    connectors,
  };

  return <>{children?.(renderProps)}</>;
}

export function createModalProvider(
  modalConfig: Extract<ModalConfigType, { from: "starknetReact" }>,
  chains: [StarknetChains.Chain, ...StarknetChains.Chain[]],
  rpcUrls?: Record<string, string>,
  bridgeProps?: KitBridgeProps,
): ModalInstance<ButtonProps> {
  function resolveRecommended(
    recommended?: RecommendedConnectorName[],
  ): Connector[] {
    if (!recommended) return [];

    return recommended.map((name) => connectorMap[name]());
  }

  function ProviderInner({ children }: { children: React.ReactNode }) {
    const recommendedConnectors = resolveRecommended(
      modalConfig.options?.recommended,
    );

    const { connectors } = useInjectedConnectors({
      recommended: recommendedConnectors,
      includeRecommended: modalConfig.options?.includeRecommended ?? "always",
    });

    const resolvedConnectors = modalConfig.options?.connectors ?? connectors;

    const provider = React.useMemo(
      () =>
        jsonRpcProvider({
          rpc: (chain) => ({
            nodeUrl:
              rpcUrls?.[chain.network]?.[0] ??
              chain.rpcUrls.default.http[0] ??
              "",
          }),
        }),
      [rpcUrls],
    );

    return (
      <StarknetConfig
        chains={chains as any}
        provider={provider}
        connectors={resolvedConnectors}
        explorer={voyager}
      >
        {bridgeProps && <KitBridge {...bridgeProps} />}
        {children}
      </StarknetConfig>
    );
  }

  // ProviderInner uses hooks so it must be wrapped in StarknetConfig
  // We use a shell that doesn't require hooks for the outer Provider
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return <ProviderInner>{children}</ProviderInner>;
  };

  const ConnectButton: React.FC<ButtonProps> = (props) => {
    return <ConnectButtonInner {...props} />;
  };

  return { Provider, ConnectButton };
}
