import React, { useSyncExternalStore } from "react";
import { createStore } from "./store/store";
import type { StarknetAbiType, StarknetEventArgs } from "./types/abi.type";
import type {
  ExtractStarknetFunctionNames,
  StarknetFunctionArgs,
  StarknetFunctionReturn,
  ExtractStarknetEventNames,
} from "./types/abi.type";
import { type CreateConfigType } from "./types/config.type";
import type {
  MutateOptionsType,
  QueryOptionsType,
} from "./types/functions.type";
import type { CommonButtonRenderProps } from "./types/button.type";
import {
  type ArgsOrCalldata,
  type GetTransactionReceiptResponse,
} from "starknet";

// ----------------------------------------------------------------
// Modal instance shape
// ----------------------------------------------------------------
export type ModalInstance<TButtonProps = unknown> = {
  Provider: React.FC<{ children: React.ReactNode }>;
  ConnectButton: React.FC<TButtonProps>;
};

type ButtonProps = {
  children?: (props: CommonButtonRenderProps) => React.ReactNode;
  [key: string]: any;
};

// ----------------------------------------------------------------
// create()
// ----------------------------------------------------------------
export function create<TAbi extends StarknetAbiType>(
  config: CreateConfigType<TAbi>,
) {
  const store = createStore(config);

  // ----------------------------------------------------------------
  // Modal — lazy loaded per provider
  // ----------------------------------------------------------------
  const getModal = async (): Promise<ModalInstance<any> | null> => {
    const modal = config.modalConfig;
    if (!modal) return null;

    const bridgeProps = {
      onConnect: (address: string, chainId: bigint, account: any) => {
        store.setState({
          wallet: {
            ...store.getState().wallet,
            isConnected: true,
            isConnecting: false,
            address,
            chainId,
          },
          _account: account,
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
          _account: undefined,
        });
      },
    };

    switch (modal.from) {
      case "starknetReact": {
        const { createModalProvider } =
          await import("./context/providers/starknetReact.provider");
        return createModalProvider(
          modal,
          config.chains,
          config.rpcUrls,
          bridgeProps,
        );
      }
      default:
        return null;
    }
  };

  const modalPromise = getModal();

  // ----------------------------------------------------------------
  // Provider
  // ----------------------------------------------------------------
  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [ModalProvider, setModalProvider] = React.useState<React.FC<{
      children: React.ReactNode;
    }> | null>(null);
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      modalPromise.then((instance) => {
        if (instance) setModalProvider(() => instance.Provider);
        setReady(true);
      });
    }, []);

    if (!ready) return null;
    if (!ModalProvider) return <>{children}</>;
    return <ModalProvider>{children}</ModalProvider>;
  };

  // ----------------------------------------------------------------
  // ConnectButton
  // ----------------------------------------------------------------
  const ConnectButton: React.FC<ButtonProps> = (props) => {
    const [ModalButton, setModalButton] = React.useState<React.FC<any> | null>(
      null,
    );
    const [ready, setReady] = React.useState(false);

    React.useEffect(() => {
      modalPromise.then((instance) => {
        if (instance) setModalButton(() => instance.ConnectButton);
        setReady(true);
      });
    }, []);

    if (!ready) return null;
    if (!ModalButton) return null;
    return <ModalButton {...(props as any)} />;
  };

  // ----------------------------------------------------------------
  // Contract calls
  // ----------------------------------------------------------------
  const call = {
    /**
     * Calls a view function on the Starknet contract.
     *
     * @param functionName - ABI function name (state_mutability: "view")
     * @param args - tuple of arguments matching the ABI signature
     * @param options - optional call overrides (blockIdentifier, etc.)
     *
     * @returns resolved data or error
     *
     * @example
     * const { data } = await call.queryFn("get_counter", []);
     */
    queryFn: <FnName extends ExtractStarknetFunctionNames<TAbi, "view">>(
      functionName: FnName,
      args: StarknetFunctionArgs<TAbi, FnName>,
      options?: QueryOptionsType,
    ): Promise<{
      data?: StarknetFunctionReturn<TAbi, FnName>;
      error?: { message: string; raw: unknown };
    }> => {
      return store.queryFn(
        functionName,
        [...(args as ArgsOrCalldata)],
        options,
      ) as any;
    },

    /**
     * Invokes an external function on the Starknet contract.
     *
     * @param functionName - ABI function name (state_mutability: "external")
     * @param args - tuple of arguments matching the ABI signature
     * @param options - optional invoke overrides (maxFee, nonce, etc.)
     *
     * @returns transaction hash and receipt or error
     *
     * @example
     * const { data } = await call.mutateFn("increase_counter", [BigInt(1)]);
     * console.log(data?.hash);
     */
    mutateFn: <FnName extends ExtractStarknetFunctionNames<TAbi, "external">>(
      functionName: FnName,
      args: StarknetFunctionArgs<TAbi, FnName>,
      options?: MutateOptionsType,
    ): Promise<{
      data?: { hash?: string; receipt?: GetTransactionReceiptResponse };
      error?: { message: string; raw: unknown };
    }> => {
      return store.mutateFn(
        functionName,
        [...(args as ArgsOrCalldata)],
        options,
      );
    },

    /**
     * Subscribes to one or more contract events.
     *
     * @param eventNameOrMap - single event name or map of listeners
     * @param listener - callback (only for single event form)
     * @returns cleanup function
     *
     * @example
     * // single
     * const cleanup = call.listenFn("CounterIncreased", (value) => {
     *   console.log(value);
     * });
     *
     * // multiple
     * const cleanup = call.listenFn({
     *   increase: { eventName: "CounterIncreased", listener: refetch },
     *   decrease: { eventName: "CounterDecreased", listener: refetch },
     * });
     *
     * cleanup();
     */
    listenFn: <EventName extends ExtractStarknetEventNames<TAbi>>(
      eventNameOrMap:
        | EventName
        | Record<
            string,
            {
              eventName: EventName;
              listener: (event: {
                data: StarknetEventArgs<TAbi, EventName>;
                keys: string[];
              }) => void;
            }
          >,
      listener?: (event: {
        data: StarknetEventArgs<TAbi, EventName>;
        keys: string[];
      }) => void,
    ): (() => void) => {
      if (typeof eventNameOrMap === "string") {
        return store.listenFn({
          _single: {
            eventName: eventNameOrMap,
            listener: listener as any,
          },
        });
      }

      return store.listenFn(
        eventNameOrMap as Record<
          string,
          {
            eventName: string;
            listener: (event: { data: unknown; keys: string[] }) => void;
          }
        >,
      );
    },
  };

  // ----------------------------------------------------------------
  // Hook
  // ----------------------------------------------------------------
  function useStore() {
    const state = useSyncExternalStore(store.subscribe, store.getState, () =>
      store.getState(),
    );

    return {
      call,
      wallet: {
        account: state.wallet,
      },
    };
  }

  // Static access
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
    ConnectButton: typeof ConnectButton;
  };
}
