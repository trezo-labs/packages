import { ethers } from "ethers";
import {
  AbiType,
  CreateConfigType,
  MutateOptionsType,
  QueryOptionsType,
} from "@/core/config";
import { getInitialState, StoreType } from "@/core/state";
import {
  AbiParametersToPrimitiveTypes,
  EvmAbiFunctionArgsTuple,
  EvmAbiFunctionReturn,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiFunctionNames,
} from "@/core/types";
import { queryFn } from "@/functions/query";
import { mutateFn } from "@/functions/mutate";
import { listenFn } from "@/functions/listen";

export function createStore<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
) {
  let state: StoreType<TAbi> = getInitialState();

  /* ---------------------------------------------------------------- */
  /* Pub/Sub                                                           */
  /* ---------------------------------------------------------------- */

  const subscribers = new Set<() => void>();

  const getState = (): StoreType<TAbi> => state;

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

  /* ---------------------------------------------------------------- */
  /* Wallet bridge — called by KitBridge / modal providers            */
  /* ---------------------------------------------------------------- */

  const onConnect = (
    address: string,
    chainId: number,
    signer: ethers.Signer,
  ) => {
    setState({
      wallet: {
        ...state.wallet,
        isConnected: true,
        isConnecting: false,
        address: address as any,
        chainId,
      },
      _signer: signer,
      _provider: signer.provider ?? undefined,
      _contract: undefined,
    });
  };

  const onDisconnect = () => {
    setState({
      wallet: {
        ...state.wallet,
        isConnected: false,
        address: undefined,
        chainId: undefined,
      },
      _signer: undefined,
      _contract: undefined,
    });
  };

  /* ---------------------------------------------------------------- */
  /* Typed call wrappers                                               */
  /* ---------------------------------------------------------------- */

  const call = {
    queryFn: <FnName extends ExtractAbiFunctionNames<TAbi, "view" | "pure">>(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
      options?: QueryOptionsType,
    ): Promise<{
      data?: EvmAbiFunctionReturn<TAbi, FnName>;
      error?: { message: string; raw: unknown };
    }> => queryFn(config, state, setState, functionName, args, options),

    mutateFn: <
      FnName extends ExtractAbiFunctionNames<TAbi, "nonpayable" | "payable">,
    >(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
      options?: MutateOptionsType,
    ): Promise<{
      data?: { hash?: string; receipt?: ethers.TransactionReceipt };
      error?: { message: string; raw: unknown };
    }> => mutateFn(config, state, setState, functionName, args, options),

    listenFn: <EventName extends ExtractAbiEventNames<TAbi>>(
      eventNameOrMap:
        | EventName
        | Record<
            string,
            {
              eventName: EventName;
              listener: (
                ...args: AbiParametersToPrimitiveTypes<
                  ExtractAbiEvent<TAbi, EventName>["inputs"]
                >
              ) => void;
            }
          >,
      listener?: (
        ...args: AbiParametersToPrimitiveTypes<
          ExtractAbiEvent<TAbi, EventName>["inputs"]
        >
      ) => void,
    ): (() => void) =>
      listenFn(config, state, eventNameOrMap as any, listener as any),
  };

  return {
    getState,
    setState,
    subscribe,
    call,
    onConnect,
    onDisconnect,
  };
}

export type TrezoStore<TAbi extends AbiType> = ReturnType<
  typeof createStore<TAbi>
>;
