import { ethers } from "ethers";
import { AbiType, CreateConfigType } from "../core/config";
import { StoreType } from "../core/state";
import {
  AbiParametersToPrimitiveTypes,
  ExtractAbiEvent,
  ExtractAbiEventNames,
} from "../core/types";
import { resolveRpcUrl } from "../core/provider";
import { createEventPoller } from "./events";

type ListenerMap<TAbi extends AbiType> = Record<
  string,
  {
    eventName: ExtractAbiEventNames<TAbi>;
    listener: (
      ...args: AbiParametersToPrimitiveTypes<
        ExtractAbiEvent<TAbi, ExtractAbiEventNames<TAbi>>["inputs"]
      >
    ) => void;
  }
>;

/**
 * Subscribes to one or more smart contract events.
 *
 * Falls back to block-polling automatically when `eth_newFilter`
 * is not available (most public / free-tier RPCs).
 *
 * @param config - The trezo config created via `create()`
 * @param state  - Current store state snapshot
 * @param eventNameOrMap - Single event name OR a map of `{ eventName, listener }` entries
 * @param listener - Callback (required only for single-event usage)
 *
 * @returns Cleanup function — call it to unsubscribe
 *
 * @example
 * // Single event
 * const cleanup = listenFn(config, state, "TaskAdded", (user, id, content) => {
 *   console.log(user, id, content);
 * });
 * cleanup();
 *
 * // Multiple events
 * const cleanup = listenFn(config, state, {
 *   add:    { eventName: "TaskAdded",   listener: refetch },
 *   remove: { eventName: "TaskRemoved", listener: refetch },
 * });
 * cleanup();
 */
export function listenFn<
  TAbi extends AbiType,
  EventName extends ExtractAbiEventNames<TAbi>,
>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  eventNameOrMap:
    | EventName
    | ListenerMap<TAbi>,
  listener?: (
    ...args: AbiParametersToPrimitiveTypes<
      ExtractAbiEvent<TAbi, EventName>["inputs"]
    >
  ) => void,
): () => void {
  // Normalise single-event shorthand into the map shape
  const listenersMap: ListenerMap<TAbi> =
    typeof eventNameOrMap === "string"
      ? ({
          _single: {
            eventName: eventNameOrMap as ExtractAbiEventNames<TAbi>,
            listener: listener! as any,
          },
        } as ListenerMap<TAbi>)
      : (eventNameOrMap as ListenerMap<TAbi>);

  const rpcUrl = resolveRpcUrl(config, state);
  if (!rpcUrl) {
    console.error("[trezo/evm] listenFn: No RPC URL available for event listening");
    return () => {};
  }

  // Always use a fresh read-only provider/contract for events
  const provider = rpcUrl.startsWith("wss")
    ? new ethers.WebSocketProvider(rpcUrl)
    : new ethers.JsonRpcProvider(rpcUrl);

  const contract = new ethers.Contract(
    config.address,
    config.abi as ethers.InterfaceAbi,
    provider,
  );

  const cleanups: Array<() => void> = [];
  const entries = Object.values(listenersMap).filter(Boolean);

  for (const entry of entries) {
    let fallbackCleanup: (() => void) | undefined;

    contract.on(entry.eventName as string, entry.listener as any).catch((error: any) => {
      const isRpcRestriction =
        error.message?.includes("eth_newFilter") ||
        error.message?.includes("whitelisted");

      if (isRpcRestriction) {
        console.warn(`[trezo/evm] Falling back to polling for event: ${entry.eventName}`);
        fallbackCleanup = createEventPoller(
          { provider, contract, eventName: entry.eventName as string },
          entry.listener as (...args: unknown[]) => void,
        );
      } else {
        console.error(`[trezo/evm] Failed to set up listener for ${entry.eventName}:`, error);
      }
    });

    cleanups.push(() => {
      contract.off(entry.eventName as string, entry.listener as any);
      fallbackCleanup?.();
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
