import React, { useSyncExternalStore } from "react";

import type {
  AbiParametersToPrimitiveTypes,
  EvmAbiFunctionArgsTuple,
  EvmAbiFunctionReturn,
  ExtractAbiEvent,
  ExtractAbiEventNames,
  ExtractAbiFunctionNames,
} from "./types/abi.type";
import { createStore } from "./store/store";
import { AbiType, Chains, CreateConfigType } from "./types/config.type";

import { MutateOptionsType, QueryOptionsType } from "./types/functions.type";
import { ethers } from "ethers";
import { CommonButtonRenderProps } from "./types/button.type";

type ButtonProps = {
  children?: (props: CommonButtonRenderProps) => React.ReactNode;
  [key: string]: any;
};

export type ModalInstance<TButtonProps = unknown> = {
  Provider: React.FC<{ children: React.ReactNode }>;
  ConnectButton: React.FC<TButtonProps>;
};

export function create<TAbi extends AbiType>(config: CreateConfigType<TAbi>) {
  const store = createStore(config);

  const getModal = async (): Promise<ModalInstance<any> | null> => {
    const modal = config.modalConfig;
    if (!modal) return null;

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

    switch (modal.from) {
      case "family": {
        const { createModalProvider } =
          await import("./context/providers/family.provider");
        return createModalProvider(
          modal,
          config.chains,
          config.rpcUrls,
          bridgeProps,
        );
      }
      case "reown": {
        const { createModalProvider } =
          await import("./context/providers/reown.provider");
        return createModalProvider(modal, config.chains, bridgeProps);
      }
      default:
        return null;
    }
  };

  // Resolve once at module load
  const modalPromise = getModal();

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

  const call = {
    /**
     * Calls a read-only (view/pure) smart contract function.
     *
     * @param functionName - ABI function name
     * @param args - tuple of arguments matching the ABI signature
     * @param options - optional overrides (from, blockTag, gasLimit, value)
     *
     * @returns resolved contract data or error
     *
     * @example
     * // view function
     * const { data } = await call.queryFn("getTask", [BigInt(1)]);
     *
     * // with options
     * await call.queryFn("balanceOf", ["0xabc..."], {
     *   blockTag: "latest",
     * });
     */
    queryFn: <FnName extends ExtractAbiFunctionNames<TAbi, "view" | "pure">>(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
      options?: QueryOptionsType,
    ): Promise<{
      data?: EvmAbiFunctionReturn<TAbi, FnName>;
      error?: { message: string; raw: unknown };
    }> => {
      return store.queryFn(functionName, [...args], options);
    },

    /**
     * Executes a state-changing contract function (nonpayable/payable).
     *
     * @param functionName - ABI function name
     * @param args - tuple of arguments matching the ABI signature
     * @param options - optional overrides (gas, value, nonce, etc.)
     *
     * @returns transaction hash, receipt, or error
     *
     * @example
     * // write function
     * const { data } = await call.mutateFn("addTask", ["Buy milk"]);
     *
     * console.log(data?.hash);
     *
     * // payable
     * await call.mutateFn("tip", [], {
     *   value: ethers.parseEther("0.01"),
     * });
     */
    mutateFn: <
      FnName extends ExtractAbiFunctionNames<TAbi, "nonpayable" | "payable">,
    >(
      functionName: FnName,
      args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
      options?: MutateOptionsType,
    ): Promise<{
      data?: {
        hash?: string;
        receipt?: ethers.TransactionReceipt;
      };
      error?: { message: string; raw: unknown };
    }> => {
      return store.mutateFn(functionName, [...args], options);
    },

    /**
     * Subscribes to one or more contract events.
     *
     * @param eventNameOrMap - single event name or map of listeners
     * @param listener - callback (only for single event)
     * @returns cleanup function to unsubscribe
     *
     * @example
     * // single event
     * const cleanup = call.listenFn("TaskAdded", (user, id) => {
     *   console.log(user, id);
     * });
     *
     * // multiple events
     * const cleanup = call.listenFn({
     *   add: { eventName: "TaskAdded", listener: refetch },
     *   remove: { eventName: "TaskRemoved", listener: refetch },
     * });
     *
     * cleanup();
     */
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
    ): (() => void) => {
      if (typeof eventNameOrMap === "string") {
        return store.listenFn({
          _single: {
            eventName: eventNameOrMap,
            listener: listener! as (
              ...args: AbiParametersToPrimitiveTypes<
                ExtractAbiEvent<TAbi, EventName>["inputs"]
              >
            ) => void,
          },
        } as Record<
          string,
          {
            eventName: string;
            listener: (
              ...args: AbiParametersToPrimitiveTypes<
                ExtractAbiEvent<TAbi, EventName>["inputs"]
              >
            ) => void;
          }
        >);
      }

      return store.listenFn(
        eventNameOrMap as Record<
          string,
          {
            eventName: string;
            listener: (
              ...args: AbiParametersToPrimitiveTypes<
                ExtractAbiEvent<TAbi, ExtractAbiEventNames<TAbi>>["inputs"]
              >
            ) => void;
          }
        >,
      );
    },
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
    ConnectButton: typeof ConnectButton;
  };
}

// const { call } = create({
//   address: "0x",
//   abi: [
//     {
//       inputs: [
//         {
//           internalType: "string",
//           name: "content",
//           type: "string",
//         },
//       ],
//       name: "addTask",
//       outputs: [],
//       stateMutability: "nonpayable",
//       type: "function",
//     },
//     {
//       inputs: [
//         {
//           internalType: "uint256",
//           name: "id",
//           type: "uint256",
//         },
//       ],
//       name: "removeTask",
//       outputs: [],
//       stateMutability: "nonpayable",
//       type: "function",
//     },
//     {
//       anonymous: false,
//       inputs: [
//         {
//           indexed: true,
//           internalType: "address",
//           name: "user",
//           type: "address",
//         },
//         {
//           indexed: true,
//           internalType: "uint256",
//           name: "taskId",
//           type: "uint256",
//         },
//         {
//           indexed: false,
//           internalType: "string",
//           name: "content",
//           type: "string",
//         },
//       ],
//       name: "TaskAdded",
//       type: "event",
//     },
//     {
//       anonymous: false,
//       inputs: [
//         {
//           indexed: true,
//           internalType: "address",
//           name: "user",
//           type: "address",
//         },
//         {
//           indexed: true,
//           internalType: "uint256",
//           name: "taskId",
//           type: "uint256",
//         },
//       ],
//       name: "TaskRemoved",
//       type: "event",
//     },
//     {
//       anonymous: false,
//       inputs: [
//         {
//           indexed: true,
//           internalType: "address",
//           name: "user",
//           type: "address",
//         },
//         {
//           indexed: true,
//           internalType: "uint256",
//           name: "taskId",
//           type: "uint256",
//         },
//         {
//           indexed: false,
//           internalType: "bool",
//           name: "completed",
//           type: "bool",
//         },
//       ],
//       name: "TaskToggled",
//       type: "event",
//     },
//     {
//       anonymous: false,
//       inputs: [
//         {
//           indexed: true,
//           internalType: "address",
//           name: "user",
//           type: "address",
//         },
//         {
//           indexed: true,
//           internalType: "uint256",
//           name: "taskId",
//           type: "uint256",
//         },
//         {
//           indexed: false,
//           internalType: "string",
//           name: "newContent",
//           type: "string",
//         },
//       ],
//       name: "TaskUpdated",
//       type: "event",
//     },
//     {
//       inputs: [
//         {
//           internalType: "uint256",
//           name: "id",
//           type: "uint256",
//         },
//       ],
//       name: "toggleTaskComplete",
//       outputs: [],
//       stateMutability: "nonpayable",
//       type: "function",
//     },
//     {
//       inputs: [
//         {
//           internalType: "uint256",
//           name: "id",
//           type: "uint256",
//         },
//         {
//           internalType: "string",
//           name: "newContent",
//           type: "string",
//         },
//       ],
//       name: "updateTaskContent",
//       outputs: [],
//       stateMutability: "nonpayable",
//       type: "function",
//     },
//     {
//       inputs: [],
//       name: "fetchAllTasks",
//       outputs: [
//         {
//           components: [
//             {
//               internalType: "uint256",
//               name: "id",
//               type: "uint256",
//             },
//             {
//               internalType: "string",
//               name: "content",
//               type: "string",
//             },
//             {
//               internalType: "bool",
//               name: "completed",
//               type: "bool",
//             },
//           ],
//           internalType: "struct TrezoTodo.Task[]",
//           name: "result",
//           type: "tuple[]",
//         },
//       ],
//       stateMutability: "view",
//       type: "function",
//     },
//     {
//       inputs: [
//         {
//           internalType: "uint256",
//           name: "id",
//           type: "uint256",
//         },
//       ],
//       name: "getTask",
//       outputs: [
//         {
//           components: [
//             {
//               internalType: "uint256",
//               name: "id",
//               type: "uint256",
//             },
//             {
//               internalType: "string",
//               name: "content",
//               type: "string",
//             },
//             {
//               internalType: "bool",
//               name: "completed",
//               type: "bool",
//             },
//           ],
//           internalType: "struct TrezoTodo.Task",
//           name: "",
//           type: "tuple",
//         },
//       ],
//       stateMutability: "view",
//       type: "function",
//     },
//     {
//       inputs: [],
//       name: "MAX_CONTENT_LENGTH",
//       outputs: [
//         {
//           internalType: "uint256",
//           name: "",
//           type: "uint256",
//         },
//       ],
//       stateMutability: "view",
//       type: "function",
//     },
//     {
//       inputs: [],
//       name: "taskCount",
//       outputs: [
//         {
//           internalType: "uint256",
//           name: "",
//           type: "uint256",
//         },
//       ],
//       stateMutability: "view",
//       type: "function",
//     },
//   ] as const,
//   chains: [Chains.optimismSepolia, Chains.optimism, Chains.mainnet],
//   rpcUrls: {
//     11155420: "https://optimism-sepolia-public.nodies.app", // optimismSepolia chainId
//   },
//   modalConfig: {
//     from: "family",
//     options: {
//       projectId: "",
//       appInfo: {
//         name: "Trezo",
//       },
//     },
//   },
// });

// // ✅ No args — MAX_CONTENT_LENGTH has no inputs
// call.queryFn("MAX_CONTENT_LENGTH", []);

// // ✅ Options only — fetchAllTasks has no inputs
// call.queryFn("fetchAllTasks", [], { blockTag: "latest" });

// // ✅ Args required — addTask has inputs
// call.mutateFn("addTask", ["my task"]);

// // ❌ TypeScript error — addTask requires args
// call.mutateFn("addTask", [""]);
