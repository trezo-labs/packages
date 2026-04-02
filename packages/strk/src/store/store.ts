import {
  ArgsOrCalldata,
  Contract,
  RpcProvider,
  hash,
  type Abi,
  type AccountInterface,
  type GetTransactionReceiptResponse,
} from "starknet";
import type { StarknetAbiType } from "../types/abi.type";
import type { CreateConfigType } from "../types/config.type";

import { MutateOptionsType, QueryOptionsType } from "../types/functions.type";
import { getInitialState, StoreType } from "./state";

export function createStore<TAbi extends StarknetAbiType>(
  config: CreateConfigType<TAbi>,
) {
  let state: StoreType<TAbi> = getInitialState();

  // ----------------------------------------------------------------
  // Subscribers
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
  // Provider / Account / Contract
  // ----------------------------------------------------------------
  const resolveRpcUrl = (): string | undefined => {
    const chainNetwork =
      state.wallet.chainId?.toString() ?? config.chains[0]?.network;
    const userRpc = config.rpcUrls?.[chainNetwork ?? ""];
    const defaultRpc = config.chains.find(
      (c) =>
        c.network === chainNetwork ||
        c.id.toString() === state.wallet.chainId?.toString(),
    )?.rpcUrls.default.http[0];
    return userRpc ?? defaultRpc;
  };

  const getProvider = (): RpcProvider => {
    if (state._provider) return state._provider as RpcProvider;
    const rpcUrl = resolveRpcUrl();
    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    setState({ _provider: provider });
    return provider;
  };

  const getAccount = (): AccountInterface => {
    if (!state._account) throw new Error("No account connected");
    return state._account;
  };

  const getContract = (forWrite = false): Contract => {
    const runner = forWrite ? getAccount() : getProvider();
    return new Contract({
      abi: config.abi as unknown as Abi,
      address: config.address,
      providerOrAccount: runner,
    });
  };

  // ----------------------------------------------------------------
  // Error extraction
  // ----------------------------------------------------------------
  const extractError = (error: unknown): { message: string; raw: unknown } => {
    if (!(error instanceof Error)) {
      return { message: "Unknown error", raw: error };
    }
    const err = error as any;

    // Starknet execution error shape
    if (err?.message?.includes("Execution failed")) {
      const match = err.message.match(/Error message: (.+?)(?:\n|$)/);
      if (match?.[1]) return { message: match[1].trim(), raw: error };
    }

    if (err?.data?.message) return { message: err.data.message, raw: error };
    if (err?.baseError?.message)
      return { message: err.baseError.message, raw: error };

    return { message: error.message, raw: error };
  };

  // ----------------------------------------------------------------
  // Result unwrapping
  // ----------------------------------------------------------------
  const unwrapResult = (result: any): any => {
    if (result === undefined || result === null) return result;

    // Single value result from starknet.js
    if (typeof result === "bigint") return result;
    if (typeof result === "boolean") return result;
    if (typeof result === "string") return result;
    if (typeof result === "number") return BigInt(result);

    // Array result
    if (Array.isArray(result)) {
      if (result.length === 1) return unwrapResult(result[0]);
      return result.map(unwrapResult);
    }

    // Object result (struct)
    if (typeof result === "object") {
      return Object.fromEntries(
        Object.entries(result).map(([k, v]) => [k, unwrapResult(v)]),
      );
    }

    return result;
  };

  // ----------------------------------------------------------------
  // Contract calls
  // ----------------------------------------------------------------
  const queryFn = async <T = unknown>(
    functionName: string,
    args: ArgsOrCalldata,
    options?: QueryOptionsType,
  ): Promise<{ data?: T; error?: { message: string; raw: unknown } }> => {
    try {
      const contract = getContract(false);
      const result = await contract.call(functionName, args, {
        blockIdentifier: options?.blockIdentifier ?? "latest",
        parseResponse: options?.parseResponse ?? true,
      });
      return { data: unwrapResult(result) as T };
    } catch (error) {
      return { error: extractError(error) };
    }
  };

  const mutateFn = async (
    functionName: string,
    args: ArgsOrCalldata,
    options?: MutateOptionsType,
  ): Promise<{
    data?: { hash?: string; receipt?: GetTransactionReceiptResponse };
    error?: { message: string; raw: unknown };
  }> => {
    if (!state.wallet.isConnected || !state._account) {
      return {
        error: { message: "Wallet not connected", raw: "Wallet not connected" },
      };
    }

    try {
      const contract = getContract(true);

      const tx = await contract.invoke(functionName, args, {
        maxFeeInGasToken: options?.maxFee,
        nonce: options?.nonce,
        parseRequest: options?.parseRequest ?? true,
      });

      const receipt = options?.waitForReceipt
        ? await getProvider().waitForTransaction(tx.transaction_hash)
        : undefined;

      return { data: { hash: tx.transaction_hash, receipt } };
    } catch (error) {
      return { error: extractError(error) };
    }
  };

  // ----------------------------------------------------------------
  // Event listening
  // ----------------------------------------------------------------
  const listenFn = (
    listenersMap: Record<
      string,
      {
        eventName: string;
        listener: (event: { data: unknown; keys: string[] }) => void;
        fromBlock?: number;
        toBlock?: number;
        pollInterval?: number;
      }
    >,
  ): (() => void) => {
    const cleanups: Array<() => void> = [];
    const entries = Object.values(listenersMap).filter(Boolean);
    const provider = getProvider();

    for (const entry of entries) {
      let intervalId: ReturnType<typeof setInterval> | undefined;
      let lastProcessedBlock = entry.fromBlock ?? 0;

      const poll = async () => {
        try {
          const currentBlock = await provider.getBlockNumber();
          if (currentBlock <= lastProcessedBlock) return;

          const eventKey = hash.getSelectorFromName(
            entry.eventName.split("::").pop() ?? entry.eventName,
          );

          const events = await provider.getEvents({
            address: config.address,
            keys: [[eventKey]],
            from_block: { block_number: Math.max(0, lastProcessedBlock) },
            to_block: { block_number: currentBlock },
            chunk_size: 100,
          });

          lastProcessedBlock = currentBlock;

          for (const event of events.events) {
            entry.listener({
              data: event.data,
              keys: event.keys,
            });
          }
        } catch (error) {
          console.warn(`Event polling error for ${entry.eventName}:`, error);
        }
      };

      // Initial block fetch
      provider.getBlockNumber().then((b) => {
        lastProcessedBlock = entry.fromBlock ?? b;
      });

      const interval =
        entry.pollInterval ??
        (resolveRpcUrl()?.startsWith("wss://") ? 2000 : 5000);
      intervalId = setInterval(poll, interval);
      cleanups.push(() => clearInterval(intervalId));
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
