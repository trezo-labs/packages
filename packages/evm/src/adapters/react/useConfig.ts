"use client";

import { useSyncExternalStore } from "react";
import { getActiveStore } from "@/context/registry";
import type { AbiType } from "@/core/types";
import type { TrezoStore } from "@/store/store";

/**
 * useConfig()
 *
 * Returns the live trezo state and typed contract call methods.
 * Must be called inside a component tree wrapped by `<Provider config={...}>`.
 *
 * The hook takes **no arguments** — the active config is resolved
 * automatically from the nearest `<Provider>`.
 *
 * @returns
 * - `call`         — `{ queryFn, mutateFn, listenFn }` — typed contract calls
 * - `wallet`       — `{ account: { isConnected, address, chainId, … } }`
 * - `web3Provider` — `{ isAvailable, error }`
 *
 * @example
 * import { useConfig } from "@trezo/evm/react";
 *
 * function MyComponent() {
 *   const { call, wallet } = useConfig();
 *
 *   async function load() {
 *     const { data } = await call.queryFn("getTask", [BigInt(1)]);
 *     console.log(data);
 *   }
 *
 *   return (
 *     <div>
 *       {wallet.account.isConnected ? wallet.account.address : "Not connected"}
 *     </div>
 *   );
 * }
 */
export function useConfig<TAbi extends AbiType = AbiType>() {
  // getActiveStore throws a clear error if called outside <Provider>
  const store = getActiveStore<TAbi>() as TrezoStore<TAbi>;

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState, // SSR snapshot
  );

  return {
    call: store.call,
    wallet: {
      account: state.wallet,
    },
    web3Provider: state.provider,
  };
}
