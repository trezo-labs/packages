import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalConfigType } from "@/src/modals";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import { createConfig, Transport, WagmiProvider } from "wagmi";
import { resolveTransport } from "@/core/utils";
import {
  ConnectKitButton,
  ConnectKitProvider,
  getDefaultConfig,
} from "connectkit";
import { useState } from "react";
import type { CommonButtonRenderProps } from "@/adapters/react/button.type";
import type { Chains } from "@/core/config";

export type FamilyButtonProps = {
  label?: string;
  showBalance?: boolean;
  showAvatar?: boolean;
  children?: (
    props: CommonButtonRenderProps & {
      isConnecting: boolean;
      ensName?: string | null;
    },
  ) => React.ReactNode;
};

export type ModalInstance<TButtonProps = unknown> = {
  Provider: React.FC<{ children: React.ReactNode }>;
  ConnectButton: React.FC<TButtonProps>;
};

export function createFamilyProvider(
  modalConfig: Extract<ModalConfigType, { from: "family" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  rpcUrls?: Record<number, string>,
  bridgeProps?: KitBridgeProps,
): ModalInstance<FamilyButtonProps> {
  const transports: Record<number, Transport> = chains.reduce(
    (acc, chain) => {
      acc[chain.id] = resolveTransport(chain, rpcUrls);
      return acc;
    },
    {} as Record<number, Transport>,
  );

  const wagmiConfig = createConfig(
    getDefaultConfig({
      chains,
      transports,
      walletConnectProjectId: modalConfig.options.projectId,
      appName: modalConfig.options.appInfo.name || "Trezo",
      enableAaveAccount: false,
    }),
  );

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [queryClient] = useState(() => new QueryClient());

    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider>
            {bridgeProps && <KitBridge {...bridgeProps} />}
            {children}
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };

  const ConnectButton: React.FC<FamilyButtonProps> = (props) => {
    if (!props.children) return <ConnectKitButton {...props} />;

    return (
      <ConnectKitButton.Custom>
        {(ckProps) =>
          props.children?.({
            isConnected: ckProps.isConnected,
            isConnecting: ckProps.isConnecting,
            address: ckProps.address,
            ensName: ckProps.ensName,
            truncatedAddress: ckProps.truncatedAddress,
            open: () => ckProps.show?.(),
            close: ckProps.hide ?? (() => {}),
          })
        }
      </ConnectKitButton.Custom>
    );
  };

  return { Provider, ConnectButton };
}
