import {
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiFunctionNames,
  AbiParametersToPrimitiveTypes,
} from "abitype";
import React, { useSyncExternalStore } from "react";

import { createEvmStore } from "../store/evm.store";
import {
  EvmAbiFunctionArgsTuple,
  EvmAbiFunctionReturn,
  EvmAbiType,
} from "../types/abi";
import { EvmConfigType } from "../types/config";

export function create<TAbi extends EvmAbiType>(config: EvmConfigType<TAbi>) {
  const store = createEvmStore(config);

  let kitPromise: Promise<any> | null = null;

  const getKit = () => {
    if (kitPromise) return kitPromise;

    kitPromise = (async () => {
      const kit = config.kit;
      const bridgeProps = {
        onConnect: (address: string, chainId: number, signer: any) => {
          store.setState({
            wallet: {
              ...store.getState().wallet,
              isConnected: true,
              isConnecting: false,
              address: address as any,
              chainId,
            },
            _signer: signer,
            _provider: signer.provider,
            _contract: undefined,
          });
        },
        onDisconnect: () => {
          store.setState({
            wallet: {
              ...store.getState().wallet,
              isConnected: false,
              address: undefined,
              chainId: undefined,
            },
            _signer: undefined,
            _contract: undefined,
          });
        },
      };

      if (kit.name === "connectkit") {
        const { createConnectkitProvider } =
          await import("../components/providers/connectkit.provider");
        return createConnectkitProvider(
          kit,
          config.chains,
          config.rpcUrl || "",
          bridgeProps,
        );
      } else if (kit.name === "reown") {
        const { createReownProvider } =
          await import("../components/providers/reown.provider");
        return createReownProvider(
          kit,
          config.chains,
          config.rpcUrl || "",
          bridgeProps,
        );
      }
    })();

    return kitPromise;
  };

  //* Type-safe call wrappers
  const call = {
    // Query (view/pure) – args as tuple
    queryFn: <FnName extends ExtractAbiFunctionNames<TAbi, "view" | "pure">>(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
    ): Promise<{
      data?: EvmAbiFunctionReturn<TAbi, FnName>;
      error?: Error;
    }> => {
      return store.queryFn(functionName, [...args]) as any;
    },

    // Mutation (nonpayable/payable) – args as tuple
    mutateFn: <
      FnName extends ExtractAbiFunctionNames<TAbi, "nonpayable" | "payable">,
    >(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
    ): Promise<{ data?: { hash: string }; error?: Error }> => {
      return store.mutateFn(functionName, [...args]) as any;
    },

    // Event listener – args are spread naturally
    listenFn: <EventName extends ExtractAbiEventNames<TAbi>>(
      eventName: EventName,
      listener: (
        ...args: AbiParametersToPrimitiveTypes<
          ExtractAbiEvent<TAbi, EventName>["inputs"]
        >
      ) => void,
    ): (() => void) => {
      return store.listenFn(eventName, listener);
    },
  };

  //* Evm Trezo Provider (Handles Kit Initialization)
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [KitProvider, setKitProvider] = React.useState<React.FC<{
      children: React.ReactNode;
    }> | null>(null);

    React.useEffect(() => {
      getKit().then((kitInstance) => {
        if (kitInstance) {
          setKitProvider(() => kitInstance.Provider);
        }
      });
    }, []);

    if (config.kit && !KitProvider) {
      return null;
    }

    if (KitProvider) {
      return <KitProvider>{children}</KitProvider>;
    }

    return <>{children}</>;
  };

  //* Evm Connect Button
  const ConnectButton: React.FC<{
    label?: string;
    showBalance?: boolean;
    showAvatar?: boolean;
    children?: (props: any) => React.ReactNode;
  }> = ({ children, ...props }) => {
    const [KitButton, setKitButton] = React.useState<React.FC<any> | null>(
      null,
    );

    React.useEffect(() => {
      getKit().then((kitInstance) => {
        if (kitInstance) {
          setKitButton(() => kitInstance.ConnectButton);
        }
      });
    }, []);

    if (config.kit && !KitButton) return null;
    if (KitButton) return <KitButton {...props}>{children}</KitButton>;

    return null;
  };

  //* React Hook
  function useStore() {
    const state = useSyncExternalStore(
      store.subscribe,
      store.getState,
      () => store.getState(), // SSR Snapshot for Next.js
    );

    return {
      call,
      web3Provider: state.provider,
      wallet: {
        account: state.wallet,
      },
    };
  }

  //* Static access (Vanilla JS access)
  useStore.call = call;
  useStore.getState = store.getState;
  useStore.subscribe = store.subscribe;
  useStore.Provider = Provider;
  useStore.ConnectButton = ConnectButton;

  return useStore as typeof useStore & {
    call: typeof call;
    getState: typeof store.getState;
    subscribe: typeof store.subscribe;
    Provider: typeof Provider;
    ConnectButton: React.FC<{
      label?: string;
      showBalance?: boolean;
      showAvatar?: boolean;
      children?: (props: any) => React.ReactNode;
    }>;
  };
}
