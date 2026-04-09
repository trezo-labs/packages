"use client";

import React from "react";
import type { AbiType } from "@/core/types";
import type { TrezoConfig } from "@/src/create";
import { registerStore } from "@/context/registry";
import { _setResolvedButton } from "./ConnectButton";

type EvmProviderProps<TAbi extends AbiType> = {
  config: TrezoConfig<TAbi>;
  children: React.ReactNode;
};

/**
 * <EvmProvider config={myConfig}>
 *
 * Wraps your app (or subtree) with the trezo context.
 * Must be placed above any component that calls `useConfig()`.
 *
 * @example
 * import { EvmProvider } from "@trezo/evm/react";
 * import { myConfig } from "./trezo";
 *
 * function App() {
 *   return (
 *     <EvmProvider config={myConfig}>
 *       <YourApp />
 *     </EvmProvider>
 *   );
 * }
 */
export function EvmProvider<TAbi extends AbiType>({
  config,
  children,
}: EvmProviderProps<TAbi>) {
  const [ModalEvmProvider, setModalEvmProvider] = React.useState<React.FC<{
    children: React.ReactNode;
  }> | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    registerStore(config._store);
  }, [config]);

  React.useEffect(() => {
    config._modalPromise.then((instance) => {
      if (instance) {
        setModalEvmProvider(() => instance.Provider);
        _setResolvedButton(instance.ConnectButton);
      } else {
        _setResolvedButton(null);
      }
      setReady(true);
    });
  }, [config]);

  if (!ready) return null;
  if (!ModalEvmProvider) return <>{children}</>;
  return <ModalEvmProvider>{children}</ModalEvmProvider>;
}
