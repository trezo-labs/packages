"use client";

import React from "react";
import { AbiType } from "@/core/types";
import type { TrezoConfig } from "@/src/create";
import { registerStore } from "@/context/registry";
import { _setResolvedButton } from "./ConnectButton";

type ProviderProps<TAbi extends AbiType> = {
  config: TrezoConfig<TAbi>;
  children: React.ReactNode;
};

/**
 * <Provider config={myConfig}>
 *
 * Wraps your app (or subtree) with the trezo context.
 * Must be placed above any component that calls `useConfig()`.
 *
 * @example
 * import { Provider } from "@trezo/evm/react";
 * import { myConfig } from "./trezo";
 *
 * function App() {
 *   return (
 *     <Provider config={myConfig}>
 *       <YourApp />
 *     </Provider>
 *   );
 * }
 */
export function Provider<TAbi extends AbiType>({
  config,
  children,
}: ProviderProps<TAbi>) {
  const [ModalProvider, setModalProvider] = React.useState<React.FC<{
    children: React.ReactNode;
  }> | null>(null);
  const [ready, setReady] = React.useState(false);

  // Register the store on first render — idempotent, safe to re-run
  React.useLayoutEffect(() => {
    registerStore(config._store);
  }, [config]);

  React.useEffect(() => {
    config._modalPromise.then((instance) => {
      if (instance) {
        setModalProvider(() => instance.Provider);
        // Wire the resolved ConnectButton into the module-level cache
        // so <ConnectButton /> works anywhere in the tree without props
        _setResolvedButton(instance.ConnectButton);
      } else {
        _setResolvedButton(null);
      }
      setReady(true);
    });
  }, [config]);

  if (!ready) return null;
  if (!ModalProvider) return <>{children}</>;
  return <ModalProvider>{children}</ModalProvider>;
}
