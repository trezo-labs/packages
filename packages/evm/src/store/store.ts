import { ethers } from "ethers";
import { AbiType, CreateConfigType } from "../types/config.type";
import { getInitialState, StoreType } from "./state";
import {
  buildOverrides,
  extractErrorMessage,
  throwError,
  unwrapResult,
} from "../lib/utils";
import { MutateOptionsType, QueryOptionsType } from "../types/functions.type";
import { createEventPoller } from "../lib/events";

export function createStore<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
) {
  let state: StoreType<TAbi> = getInitialState();

  // ----------------------------------------------------------------
  // Listeners
  // ----------------------------------------------------------------
  const subscribers = new Set<() => void>();

  const getState = () => state;

  const subscribe = (onStoreChange: () => void) => {
    subscribers.add(onStoreChange);
    return () => subscribers.delete(onStoreChange);
  };

  const setState = (
    partial:
      | Partial<StoreType<TAbi>>
      | ((prev: StoreType<TAbi>) => StoreType<TAbi>),
  ) => {
    const next =
      typeof partial === "function" ? partial(state) : { ...state, ...partial };

    if (next !== state) {
      state = next;
      subscribers.forEach((fn) => fn());
    }
  };

  // ----------------------------------------------------------------
  // Provider / Signer / Contract
  // ----------------------------------------------------------------
  const resolveRpcUrl = () => {
    const chainId = state.wallet.chainId ?? config.chains?.[0]?.id;
    const userRpc = config.rpcUrls?.[chainId!];
    const defaultRpc = config.chains?.find((c) => c.id === chainId)?.rpcUrls
      .default.http[0];
    return userRpc ?? defaultRpc;
  };

  const getProvider = () => {
    if (state._signer) return state._signer.provider;
    if (state._provider) return state._provider;

    const rpcUrl = resolveRpcUrl();
    if (rpcUrl) {
      const provider = rpcUrl.startsWith("wss")
        ? new ethers.WebSocketProvider(rpcUrl)
        : new ethers.JsonRpcProvider(rpcUrl);
      setState({ _provider: provider });
      return provider;
    }

    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      setState({ _provider: provider });
      return provider;
    }

    throwError("No provider available");
  };

  const getSigner = async () => {
    if (state._signer) return state._signer;

    if (
      state.wallet.isConnected &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setState({ _signer: signer });
      return signer;
    }

    throwError("getSigner: No signer available");
  };

  const getContract = async (forWrite = false) => {
    const runner = forWrite ? await getSigner() : getProvider();
    return new ethers.Contract(
      config.address,
      config.abi as ethers.InterfaceAbi,
      runner,
    );
  };

  const resolveAbiOutputs = (functionName: string) =>
    (config.abi as unknown as any[]).find(
      (item) => item.type === "function" && item.name === functionName,
    )?.outputs;

  const simulateCall = async (
    functionName: string,
    args: unknown[],
    overrides: Record<string, unknown>,
  ): Promise<string | null> => {
    const rpcUrl = resolveRpcUrl();
    if (!rpcUrl) return null;

    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const readContract = new ethers.Contract(
        config.address,
        config.abi as ethers.InterfaceAbi,
        provider,
      );
      await readContract[functionName]!.staticCall(...args, overrides);
      return null; // no error
    } catch (error: any) {
      // ethers with JsonRpcProvider gets the full revert data
      if (error?.revert?.args?.[0]) return String(error.revert.args[0]);
      if (error?.reason) return error.reason;

      // decode raw revert data manually
      const raw = error?.data;
      if (typeof raw === "string" && raw.startsWith("0x08c379a0")) {
        try {
          const iface = new ethers.Interface(["function Error(string)"]);
          const decoded = iface.decodeFunctionData("Error", raw);
          return decoded[0] as string;
        } catch {
          // ignore
        }
      }

      return null;
    }
  };

  // ----------------------------------------------------------------
  // Contract calls
  // ----------------------------------------------------------------
  const queryFn = async <T = unknown>(
    functionName: string,
    args: unknown[],
    options?: QueryOptionsType,
  ): Promise<{
    data?: T;
    error?: { message: string; raw: unknown };
  }> => {
    try {
      const contract = await getContract(false);
      const overrides = buildOverrides(options, state.wallet.address);

      const raw =
        Object.keys(overrides).length > 0
          ? await contract[functionName]!.staticCall(...args, overrides)
          : await contract[functionName]!.staticCall(...args);

      const data = unwrapResult(raw, resolveAbiOutputs(functionName)) as T;
      return { data };
    } catch (error) {
      return { error: extractErrorMessage(error) };
    }
  };

  const mutateFn = async (
    functionName: string,
    args: unknown[],
    options?: MutateOptionsType,
  ): Promise<{
    data?: {
      hash?: string;
      receipt?: ethers.TransactionReceipt;
    };
    error?: { message: string; raw: unknown };
  }> => {
    if (!state.wallet.isConnected)
      return {
        error: { message: "Wallet not connected", raw: "Wallet not connected" },
      };

    if (!config.chains.find((c) => c.id === state.wallet.chainId))
      return {
        error: {
          message: "Chain not supported",
          raw: `Chain ${state.wallet.chainId} not supported`,
        },
      };

    try {
      const contract = await getContract(true);
      const overrides = buildOverrides(options, state.wallet.address);

      // Simulate via direct RPC to get readable revert reason
      const revertReason = await simulateCall(functionName, args, overrides);
      if (revertReason)
        return { error: { message: revertReason, raw: revertReason } };

      if (options?.estimateGas) {
        overrides.gasLimit = await contract[functionName]!.estimateGas(
          ...args,
          overrides,
        );
      }

      const tx: ethers.TransactionResponse = await contract[functionName]!(
        ...args,
        overrides,
      );
      const receipt = await tx.wait();

      return { data: { hash: tx.hash, receipt: receipt ?? undefined } };
    } catch (error) {
      return { error: extractErrorMessage(error) };
    }
  };

  const listenFn = (
    listenersMap: Record<
      string,
      { eventName: string; listener: (...args: any[]) => void }
    >,
  ): (() => void) => {
    const cleanups: Array<() => void> = [];
    const entries = Object.values(listenersMap).filter(Boolean);

    // Always create a fresh read-only contract for events
    // so it's never tied to a stale signer/cached instance
    const rpcUrl = resolveRpcUrl();
    if (!rpcUrl) {
      console.error("listenFn: No RPC URL available for event listening");
      return () => {};
    }

    const provider = rpcUrl.startsWith("wss")
      ? new ethers.WebSocketProvider(rpcUrl)
      : new ethers.JsonRpcProvider(rpcUrl);

    const contract = new ethers.Contract(
      config.address,
      config.abi as ethers.InterfaceAbi,
      provider,
    );

    for (const entry of entries) {
      let fallbackCleanup: (() => void) | undefined;

      contract.on(entry.eventName, entry.listener).catch((error: any) => {
        const isRpcRestriction =
          error.message.includes("eth_newFilter") ||
          error.message.includes("whitelisted");

        if (isRpcRestriction) {
          console.warn(`Polling fallback for event: ${entry.eventName}`);
          fallbackCleanup = createEventPoller(
            { provider, contract, eventName: entry.eventName },
            entry.listener,
          );
        } else {
          console.error(
            `Failed to set up listener for ${entry.eventName}:`,
            error,
          );
        }
      });

      cleanups.push(() => {
        contract.off(entry.eventName, entry.listener);
        fallbackCleanup?.();
      });
    }

    return () => cleanups.forEach((fn) => fn());
  };

  return {
    getState,
    setState,
    subscribe,
    queryFn,
    mutateFn,
    listenFn,
  };
}
