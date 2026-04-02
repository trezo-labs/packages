import React, { useMemo } from "react";
import {
  StarknetConfig,
  jsonRpcProvider,
  Connector,
  useAccount,
  useConnect,
  useDisconnect,
  Address,
  publicProvider,
} from "@starknet-react/core";
import { StarknetkitConnector, useStarknetkitConnectModal } from "starknetkit";
import { InjectedConnector } from "starknetkit/injected";
import { WebWalletConnector } from "starknetkit/webwallet";
import { ControllerConnector } from "starknetkit/controller";
import { ModalConfigType } from "@/src/types/modal.type";
import { StarknetChains } from "@/src/types/config.type";
import { KitBridge, KitBridgeProps } from "../KitBridge";
import { ModalInstance } from "@/src/create";
import { StarknetkitConfigType } from "@/src/modalsFrom/starknetkit";
import { formatTruncatedAddress } from "@/src/helpers/formatAddress";
import { resolveExplorer } from "@/src/lib/utils";

export type ButtonRenderProps = {
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  truncatedAddress?: string;
  chainId?: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

export type ButtonProps = {
  children?: (props: ButtonRenderProps) => React.ReactNode;
  label?: string;
  className?: string;
};

function buildConnectors(
  options: NonNullable<StarknetkitConfigType>,
): StarknetkitConnector[] {
  const customConnectors = options.connection?.connectors;

  if (options.wallets?.controller && customConnectors?.length) {
    return customConnectors;
  }

  const connectors: StarknetkitConnector[] = [];
  const showWallets = options.wallets?.enabled ?? [
    "argent",
    "braavos",
    "metamask",
    "webwallet",
    "controller",
  ];

  if (showWallets.includes("argent")) {
    connectors.push(new InjectedConnector({ options: { id: "argentX" } }));
  }
  if (showWallets.includes("braavos")) {
    connectors.push(new InjectedConnector({ options: { id: "braavos" } }));
  }
  if (showWallets.includes("metamask")) {
    connectors.push(new InjectedConnector({ options: { id: "metamask" } }));
  }
  if (showWallets.includes("webwallet") && options.wallets?.webWallet) {
    connectors.push(
      new WebWalletConnector({
        url: options.wallets?.webWalletUrl || "https://web.argent.xyz",
        theme: options.ui?.modalTheme === "dark" ? "dark" : "light",
      }),
    );
  }
  if (showWallets.includes("controller") && options.wallets?.controller) {
    connectors.push(new ControllerConnector());
  }

  return connectors;
}

export function createModalProvider(
  modalConfig: Extract<ModalConfigType, { from: "starknetkit" }>,
  chains: [StarknetChains.Chain, ...StarknetChains.Chain[]],
  rpcUrls?: Record<string, string>,
  bridgeProps?: KitBridgeProps,
): ModalInstance<ButtonProps> {
  const options = modalConfig.options || {};
  const connectors = buildConnectors(options);
  const explorer =
    resolveExplorer(options.explorer) ?? resolveExplorer("voyager");

  const provider = useMemo(() => {
    if (options.network?.provider === "public") return publicProvider();
    else if (options.network?.provider === "jsonRpc")
      return jsonRpcProvider({
        rpc: (chain) => ({
          nodeUrl:
            rpcUrls?.[chain.network]?.[0] ??
            chain.rpcUrls.default.http[0] ??
            "",
        }),
      });
    else return publicProvider();
  }, [rpcUrls, options.network?.provider]);

  const defaultChainId = options.network?.defaultChain?.id ?? chains[0].id;

  // Provider component (no hooks used directly)
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const autoConnect = options.connection?.autoConnect ?? false;
    return (
      <StarknetConfig
        chains={chains}
        provider={provider}
        explorer={explorer}
        connectors={connectors as unknown as Connector[]}
        autoConnect={autoConnect}
        defaultChainId={defaultChainId}
      >
        {bridgeProps && <KitBridge {...bridgeProps} />}
        {children}
      </StarknetConfig>
    );
  };

  // ConnectButton component with starknetkit modal
  function ConnectButton({ children, label, className }: ButtonProps) {
    // We need to use starknet-react hooks inside a component that is inside StarknetConfig.
    // The user will place <ConnectButton /> inside <Provider>.
    // So we create an inner component that uses the hooks.
    const Inner = () => {
      const { address, chainId, isConnected, account } = useAccount();
      const {
        connectAsync,
        connectors: availableConnectors,
        isPending,
      } = useConnect();
      const { disconnectAsync } = useDisconnect();

      const { starknetkitConnectModal } = useStarknetkitConnectModal({
        connectors: availableConnectors as StarknetkitConnector[],
        modalTheme: options.ui?.modalTheme ?? "system",
        modalMode: options.ui?.modalMode ?? "alwaysAsk",
        dappName: options.ui?.dappName ?? "Connect to dApp",
      });

      const connect = async () => {
        const { connector } = await starknetkitConnectModal();
        if (!connector) return;
        await connectAsync({ connector });
      };

      const disconnect = async () => {
        await disconnectAsync();
      };

      const renderProps: ButtonRenderProps = {
        isConnected: isConnected ?? false,
        isConnecting: isPending,
        address: address ?? account?.address,
        truncatedAddress: formatTruncatedAddress(
          address ?? (account?.address as Address),
        ),
        chainId: chainId?.toString(),
        connect,
        disconnect,
      };

      if (children) {
        return <>{children(renderProps)}</>;
      }

      return (
        <button
          onClick={renderProps.isConnected ? disconnect : connect}
          disabled={renderProps.isConnecting}
          className={className || "strk-connect-button"}
        >
          {renderProps.isConnecting
            ? "Connecting..."
            : renderProps.isConnected
              ? renderProps.address
                ? `${renderProps.address.slice(0, 6)}...${renderProps.address.slice(-4)}`
                : "Connected"
              : label || "Connect Wallet"}
        </button>
      );
    };

    return <Inner />;
  }

  return { Provider, ConnectButton };
}
