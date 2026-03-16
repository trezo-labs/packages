"use client";

import React from "react";
import * as Chains from "viem/chains";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAppKit, useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

import { KitBridge } from "../KitBridge";
import { EvmKitConfigType } from "@/src/types/kit";
import { ConnectButtonRenderProps } from "./connectkit.provider";

type BridgeProps = {
  onConnect: (address: string, chainId: number, signer: any) => void;
  onDisconnect: () => void;
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

export function createReownProvider(
  kitConfig: Extract<EvmKitConfigType, { name: "reown" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  rpcUrl: string,
  bridgeProps: BridgeProps,
): KitProviderResult {
  // 1. Initialize Wagmi Adapter
  const wagmiAdapter = new WagmiAdapter({
    networks: chains as any,
    projectId: kitConfig.config.projectId,
    ssr: kitConfig.config.ssr,
  });

  // 2. Create AppKit (Ensure it's only called once globally per config)
  const metadata = {
    ...kitConfig.config.metadata,
    url:
      typeof window !== "undefined" && window.location.hostname === "localhost"
        ? window.location.origin
        : kitConfig.config.metadata.url,
  };

  if (typeof window !== "undefined") {
    createAppKit({
      adapters: [wagmiAdapter] as any,
      networks: chains as any,
      projectId: kitConfig.config.projectId,
      metadata,
      features: {
        analytics: true,
      },
    });
  }

  const queryClient = new QueryClient();

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <KitBridge {...bridgeProps} />
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );

  const ConnectButton: KitProviderResult["ConnectButton"] = ({
    children,
    ...props
  }) => {
    const { open: reownOpen, close } = useAppKit();
    const { address, isConnected, isConnecting, chainId } = useAccount();

    const open = React.useCallback(async () => {
      try {
        await reownOpen();
      } catch (e) {
        console.error("AppKit open error, retrying...", e);
        // Fallback or retry if needed, though AppKit should handle it internally
      }
    }, [reownOpen]);

    if (children) {
      return (
        <>
          {children({
            isConnected,
            isConnecting,
            address,
            ensName: null, // AppKit doesn't expose ENS directly in useAccount easily without extra hooks
            chain: chainId ? { id: chainId } : undefined,
            open,
            close,
          })}
        </>
      );
    }

    return (
      // @ts-ignore
      <appkit-button
        label={props.label}
        balance={props.showBalance ? "show" : "hide"}
      />
    );
  };

  return { Provider, ConnectButton };
}
