"use client";

import React from "react";
import * as Chains from "viem/chains";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ConnectKitProvider,
  getDefaultConfig,
  ConnectKitButton,
} from "connectkit";

import { KitBridge } from "../KitBridge";
import { EvmKitConfigType } from "@/src/types/kit";

type BridgeProps = {
  onConnect: (address: string, chainId: number, signer: any) => void;
  onDisconnect: () => void;
};

export type ConnectButtonRenderProps = {
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  ensName?: string | null;
  chain?: { id: number; name?: string };
  open: () => void;
  close: () => void;
};

type KitProviderResult = {
  Provider: React.FC<{ children: React.ReactNode }>;
  ConnectButton: React.FC<{
    label?: string;
    showBalance?: boolean;
    showAvatar?: boolean;
    children?: (props: ConnectButtonRenderProps) => React.ReactNode;
  }>;
};

export function createConnectkitProvider(
  kitConfig: Extract<EvmKitConfigType, { name: "connectkit" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  rpcUrl: string,
  bridgeProps: BridgeProps,
): KitProviderResult {
  const wagmiConfig = createConfig(
    getDefaultConfig({
      chains: chains,
      transports: Object.fromEntries(chains.map((c) => [c.id, http(rpcUrl)])),
      walletConnectProjectId: kitConfig.config.projectId,
      appName: kitConfig.config.metadata.appName,
      appDescription: kitConfig.config.metadata.appDescription,
      appUrl: kitConfig.config.metadata.appUrl,
      appIcon: kitConfig.config.metadata.appIcon,
    }),
  );

  const queryClient = new QueryClient();

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <KitBridge {...bridgeProps} />
          {children}
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );

  const ConnectButton: KitProviderResult["ConnectButton"] = ({
    children,
    ...props
  }) => {
    if (children) {
      return (
        <ConnectKitButton.Custom>
          {({
            isConnected,
            isConnecting,
            show,
            hide,
            address,
            ensName,
            chain,
          }) =>
            children({
              isConnected,
              isConnecting,
              address,
              ensName,
              chain,
              open: show ?? (() => {}),
              close: hide ?? (() => {}),
            })
          }
        </ConnectKitButton.Custom>
      );
    }

    return <ConnectKitButton {...props} />;
  };

  return { Provider, ConnectButton };
}
