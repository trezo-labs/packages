import { Chains } from "@/src/types/config.type";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModalConfigType } from "@/src/types/modal.type";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import { ModalInstance } from "@/src/create";
import { createConfig, Transport, WagmiProvider } from "wagmi";
import { resolveTransport } from "@/src/lib/utils";
import {
  ConnectKitButton,
  ConnectKitProvider,
  getDefaultConfig,
} from "connectkit";
import { useMemo, useState } from "react";
import { CommonButtonRenderProps } from "@/src/types/button.type";

type ButtonRenderProps = CommonButtonRenderProps & {
  isConnecting: boolean;
  ensName?: string | null;
};

export type ButtonProps = {
  label?: string;
  showBalance?: boolean;
  showAvatar?: boolean;
  children?: (props: ButtonRenderProps) => React.ReactNode;
};

export function createModalProvider(
  modalConfig: Extract<ModalConfigType, { from: "family" }>,
  chains: [Chains.Chain, ...Chains.Chain[]],
  rpcUrls?: Record<number, string>,
  bridgeProps?: KitBridgeProps,
): ModalInstance<ButtonProps> {
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

  const ConnectButton: React.FC<ButtonProps> = (props) => {
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
