"use client";
import { AbiType } from "./core/types";
import { CreateConfigType } from "./core/config";
import { createStore } from "./store/store";
import { KitBridgeProps } from "./context/KitBridge";
import { useSyncExternalStore } from "react";

type ModalInstance = {
  Provider: import("react").FC<{ children: import("react").ReactNode }>;
  ConnectButton: import("react").FC<any>;
};

/**
 * create(config)
 *
 * The root factory for `@trezo/evm`. Call this once at module level
 * (outside any component), then pass the returned object to
 * `<Provider config={...}>`.
 *
 * All contract types — function names, argument shapes, return types —
 * are inferred from the `abi` you provide. No manual type parameters needed.
 *
 * @example
 * // trezo.ts
 * import { create, Chains } from "@trezo/evm";
 *
 * export const myConfig = create({
 *   abi: [...] as const,
 *   address: "0x...",
 *   chains: [Chains.mainnet, Chains.optimism],
 *   rpcUrls: { 10: "https://my-rpc.example.com" },
 *   wallet: {
 *     from: "reown",
 *     options: { projectId: "...", metadata: { name: "My App", ... } },
 *   },
 * });
 *
 * // main.tsx  (React)
 * import { Provider } from "@trezo/evm/react";
 * import { myConfig } from "./trezo";
 *
 * <Provider config={myConfig}>
 *   <App />
 * </Provider>
 *
 * // AnyComponent.tsx
 * import { useConfig } from "@trezo/evm/react";
 *
 * const { call, wallet } = useConfig();
 * const { data } = await call.queryFn("getTask", [BigInt(1)]);
 */
export function create<TAbi extends AbiType>(config: CreateConfigType<TAbi>) {
  const store = createStore<TAbi>(config);

  const bridgeProps: KitBridgeProps = {
    onConnect: store.onConnect,
    onDisconnect: store.onDisconnect,
  };

  /* ---------------------------------------------------------------- */
  /* Lazily resolve the modal provider (code-split per kit)           */
  /* ---------------------------------------------------------------- */
  const modalPromise: Promise<ModalInstance | null> = (async () => {
    const modal = config.wallet;
    if (!modal) return null;

    switch (modal.from) {
      case "family": {
        const { createFamilyProvider } =
          await import("./context/providers/family.provider");
        return createFamilyProvider(
          modal,
          config.chains,
          config.rpcUrls,
          bridgeProps,
        );
      }
      case "reown": {
        const { createReownProvider } =
          await import("./context/providers/reown.provider");
        return createReownProvider(modal, config.chains, bridgeProps);
      }
      default:
        return null;
    }
  })();

  // ✅ useConfig lives here — TAbi is fully known at this scope
  function useConfig() {
    const state = useSyncExternalStore(
      store.subscribe,
      store.getState,
      store.getState,
    );

    return {
      call: store.call,
      wallet: { account: state.wallet },
      web3Provider: state.provider,
    };
  }

  return {
    _store: store,
    _raw: config,
    _modalPromise: modalPromise,
    useConfig,
  };
}

export type TrezoConfig<TAbi extends AbiType> = ReturnType<typeof create<TAbi>>;
