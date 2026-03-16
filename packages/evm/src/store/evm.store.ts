import { ethers } from "ethers";

import { getInitialState } from "./state";
import { createEventPoller } from "../utils/events";
import { mapEthersError, throwError } from "../utils/errors";
import { EvmAbiType } from "../types/abi";
import { EvmConfigType } from "../types/config";
import { EvmStoreType } from "../types/store";

export function createEvmStore<TAbi extends EvmAbiType>(
  config: EvmConfigType<TAbi>,
) {
  let state: EvmStoreType<TAbi> = getInitialState();

  // ------------------------------------------------------------------
  // 1.  Keep a Set of listener callbacks
  // ------------------------------------------------------------------
  const listeners = new Set<() => void>();

  // ------------------------------------------------------------------
  // 2.  Return the current state – this is what the hook will read
  // ------------------------------------------------------------------
  const getState = () => state;

  // ------------------------------------------------------------------
  // 3.  subscribe(callback) → unsubscribe
  // ------------------------------------------------------------------
  const subscribe = (onStoreChange: () => void) => {
    // Register the listener
    listeners.add(onStoreChange);

    // Return an “unsubscribe” function that will be called by
    // `useSyncExternalStore` when the component unmounts or
    // when the hook decides it no longer needs the store.
    return () => {
      listeners.delete(onStoreChange);
    };
  };

  // ------------------------------------------------------------------
  // 4.  setState(partial) – call listeners when the state changes
  // ------------------------------------------------------------------
  const setState = (
    partial:
      | Partial<EvmStoreType<TAbi>>
      | ((prev: EvmStoreType<TAbi>) => EvmStoreType<TAbi>),
  ) => {
    const next =
      typeof partial === "function" ? partial(state) : { ...state, ...partial };

    if (next !== state) {
      state = next;

      // Notify every listener that the state has changed
      listeners.forEach((listener) => listener());
    }
  };

  const getProvider = () => {
    if (state._signer) return state._signer.provider;
    if (state._provider) return state._provider;
    if (config.rpcUrl) {
      const provider = config.rpcUrl.startsWith("wss")
        ? new ethers.WebSocketProvider(config.rpcUrl)
        : new ethers.JsonRpcProvider(config.rpcUrl);
      setState({ _provider: provider });
      return provider;
    }
    // Fallback to injected browser provider if available (even without connected accounts)
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setState({ _provider: provider });
      return provider;
    }
    throwError(
      "getProvider: No provider available (no wallet connected, no RPC URL, and no injected provider)",
    );
  };

  // getSigner and getContract remain unchanged
  const getSigner = () => {
    if (state._signer) return state._signer;
    if (config.rpcUrl) {
      // fallback random signer (reads only)
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const wallet = ethers.Wallet.createRandom().connect(provider);
      setState({ _signer: wallet });
      return wallet;
    }
    throwError("getSigner: No signer available");
  };

  const getContract = (forWrite = false) => {
    const signerOrProvider = forWrite ? getSigner() : getProvider();
    if (state._contract && state._contract.runner === signerOrProvider) {
      return state._contract;
    }
    const contract = new ethers.Contract(
      config.address,
      config.abi as ethers.InterfaceAbi,
      signerOrProvider,
    );
    setState({ _contract: contract });
    return contract;
  };

  // A map to hold "refresh" functions for specific contract calls
  const queryRegistry = new Map<string, () => Promise<void>>();

  // --- Typed call methods ---
  // These will be wrapped with proper types in the hook; here we keep them simple
  const queryFn = async (functionName: string, args: unknown[]) => {
    // Generate a unique key based on name and arguments
    const safeArgs = JSON.stringify(args, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    const queryKey = `${functionName}:${safeArgs}`;

    const execute = async () => {
      try {
        const contract = getContract(false); // read-only provider
        const result = await contract[functionName]!(...args);
        return { data: result };
      } catch (error) {
        return { error: new Error(mapEthersError(error)) }; // Return pretty for UI
      }
    };

    // Register this query so it can be called remotely
    // Note: In a real production app, you'd likely use a library like TanStack Query,
    // but this is how you build the logic yourself!
    queryRegistry.set(queryKey, async () => {
      await execute();
    });

    return execute();
  };

  // The Refresh Trigger
  const invalidate = (functionName: string) => {
    // Find all registered queries that start with this function name
    queryRegistry.forEach((refresh, key) => {
      if (key.startsWith(`${functionName}:`)) {
        refresh();
      }
    });
  };

  const mutateFn = async (functionName: string, args: unknown[]) => {
    if (!state.wallet.isConnected)
      return { error: new Error("mutateFn: Wallet not connected") };

    // Validate chain support
    const targetChain = config.chains.find(
      (c) => c.id === state.wallet.chainId,
    );
    if (!targetChain) {
      // Optionally attempt to switch chain here, or throw
      return {
        error: new Error(
          `targetChain: Chain ${state.wallet.chainId} not supported`,
        ),
      };
    }

    try {
      const contract = getContract(true); // signer
      const tx = await contract[functionName]!(...args);
      const receipt = await tx.wait();
      return { data: { hash: tx.hash, receipt } };
    } catch (error) {
      return { error: new Error(mapEthersError(error)) };
    }
  };

  const listenFn = (eventName: string, listener: (...args: any[]) => void) => {
    let contract: ethers.Contract = getContract(false);
    let cleanupFallback: (() => void) | undefined;

    const startListening = async () => {
      try {
        await contract.on(eventName, listener);
      } catch (error: any) {
        // Detect if it's an RPC restriction error
        const isRpcRestriction =
          error.message.includes("eth_newFilter") ||
          error.message.includes("whitelisted");

        if (isRpcRestriction) {
          console.warn(`Polling fallback for event: ${eventName}`);

          // 3. Use the utility to start polling
          cleanupFallback = createEventPoller(
            {
              provider: getProvider() as ethers.Provider,
              contract,
              eventName,
            },
            listener,
          );
        } else {
          console.error("Failed to set up event listener:", error);
        }
      }
    };

    startListening();

    // Unified unmount
    return () => {
      contract.off(eventName, listener); // Cleanup standard listener
      if (cleanupFallback) cleanupFallback(); // Cleanup polling interval
    };
  };

  return {
    getState,
    setState,
    subscribe,
    queryFn,
    invalidate,
    mutateFn,
    listenFn,
  };
}
