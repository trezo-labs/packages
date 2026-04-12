import React, { useCallback } from "react";
import { createAppKit, useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WalletConfigType } from "@/src/modals";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import type { CommonButtonRenderProps } from "@/adapters/react/button.type";
import type { Chains } from "@/core/config";

let appKitInitialized = false;
let wagmiAdapterInstance: WagmiAdapter | null = null;

export type ReownButtonProps = {
  label?: string;
  balance?: "show" | "hide";
  disabled?: boolean;
  size?: "md" | "sm";
  namespace?: "eip155" | "solana" | "bip122";
  children?: (
    props: CommonButtonRenderProps & {
      isConnecting: boolean;
      caipAddress?: string;
      status?: "connected" | "disconnected" | "connecting" | "reconnecting";
    },
  ) => React.ReactNode;
};

export type ModalInstance<TButtonProps = unknown> = {
  Provider: React.FC<{ children: React.ReactNode }>;
  ConnectButton: React.FC<TButtonProps>;
};

export function createReownProvider(
  config: Extract<WalletConfigType, { from: "reown" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  bridgeProps?: KitBridgeProps,
): ModalInstance<ReownButtonProps> {
  if (!wagmiAdapterInstance) {
    wagmiAdapterInstance = new WagmiAdapter({
      networks: chains,
      projectId: config.options.projectId,
      ssr: config.options.ssr,
    });
  }

  if (!appKitInitialized && typeof window !== "undefined") {
    createAppKit({
      adapters: [wagmiAdapterInstance],
      networks: chains,
      projectId: config.options.projectId,
      metadata: config.options.metadata,
      features: config.options.features,
    });
    appKitInitialized = true;
  }

  const wagmiAdapter = wagmiAdapterInstance;
  const queryClient = new QueryClient();

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {bridgeProps && <KitBridge {...bridgeProps} />}
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );

  const ConnectButton: React.FC<ReownButtonProps> = ({
    children,
    ...props
  }) => {
    const { open: reownOpen, close } = useAppKit();
    const { address, isConnected, isConnecting, chainId } = useAccount();

    const truncatedAddress = address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : undefined;

    const open = useCallback(
      async (options?: any) => {
        try {
          await reownOpen(options);
        } catch (e) {
          console.error("[trezo/evm] AppKit open error:", e);
        }
      },
      [reownOpen],
    );

    if (children) {
      return (
        <>
          {children({
            isConnected,
            isConnecting,
            address,
            truncatedAddress,
            chainId,
            open,
            close,
          })}
        </>
      );
    }

    return React.createElement("appkit-button", {
      label: props.label,
      balance: props.balance ?? "show",
      disabled: props.disabled,
      size: props.size,
      namespace: props.namespace,
    });
  };

  return { Provider, ConnectButton };
}
