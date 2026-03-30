import React, { useCallback } from "react";
import { createAppKit, useAppKit } from "@reown/appkit/react";
import { useAccount } from "wagmi";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalInstance } from "@/src/create";
import { Chains } from "@/src/types/config.type";
import { ModalConfigType } from "@/src/types/modal.type";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import { CommonButtonRenderProps } from "@/src/types/button.type";

let appKitInitialized = false;
let wagmiAdapterInstance: WagmiAdapter | null = null;

type ButtonRenderProps = CommonButtonRenderProps & {
  isConnecting: boolean;
  caipAddress?: string;
  status?: "connected" | "disconnected" | "connecting" | "reconnecting";
};

export type ButtonProps = {
  label?: string;
  balance?: "show" | "hide";
  disabled?: boolean;
  size?: "md" | "sm";
  namespace?: "eip155" | "solana" | "bip122";
  children?: (props: ButtonRenderProps) => React.ReactNode;
};

export function createModalProvider(
  modalConfig: Extract<ModalConfigType, { from: "reown" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  bridgeProps?: KitBridgeProps,
): ModalInstance<ButtonProps> {
  if (!wagmiAdapterInstance) {
    wagmiAdapterInstance = new WagmiAdapter({
      networks: chains,
      projectId: modalConfig.options.projectId,
      ssr: modalConfig.options.ssr,
    });
  }

  if (!appKitInitialized && typeof window !== "undefined") {
    createAppKit({
      adapters: [wagmiAdapterInstance],
      networks: chains,
      projectId: modalConfig.options.projectId,
      metadata: modalConfig.options.metadata,
      features: modalConfig.options.features,
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

  const ConnectButton: React.FC<ButtonProps> = ({ children, ...props }) => {
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
          console.error("AppKit open error:", e);
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
