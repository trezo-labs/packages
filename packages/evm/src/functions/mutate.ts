import { ethers } from "ethers";
import { AbiType, CreateConfigType, MutateOptionsType } from "../core/config";
import { StoreType } from "../core/state";
import {
  EvmAbiFunctionArgsTuple,
  ExtractAbiFunctionNames,
} from "../core/types";
import { buildOverrides, extractErrorMessage } from "../core/utils";
import { getContract, resolveRpcUrl } from "../core/provider";

/* ------------------------------------------------------------------ */
/* Simulation helper (gets readable revert reasons via JSON-RPC)       */
/* ------------------------------------------------------------------ */

async function simulateCall<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  functionName: string,
  args: unknown[],
  overrides: Record<string, unknown>,
): Promise<string | null> {
  const rpcUrl = resolveRpcUrl(config, state);
  if (!rpcUrl) return null;

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const readContract = new ethers.Contract(
      config.address,
      config.abi as ethers.InterfaceAbi,
      provider,
    );
    await readContract[functionName]!.staticCall(...args, overrides);
    return null;
  } catch (error: any) {
    if (error?.revert?.args?.[0]) return String(error.revert.args[0]);
    if (error?.reason) return error.reason;

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
}

/* ------------------------------------------------------------------ */
/* mutateFn                                                             */
/* ------------------------------------------------------------------ */

/**
 * Executes a state-changing contract function (nonpayable/payable).
 *
 * Automatically:
 * - Guards against disconnected wallets
 * - Guards against unsupported chains
 * - Simulates the call first for readable revert reasons
 * - Optionally estimates gas before sending
 *
 * @param config - The trezo config created via `create()`
 * @param state  - Current store state snapshot
 * @param setState - Store state setter
 * @param functionName - ABI function name (autocompleted from ABI)
 * @param args - Tuple of arguments matching the ABI signature
 * @param options - Optional overrides (gas, value, nonce, estimateGas, etc.)
 *
 * @returns `{ data: { hash, receipt } }` on success or `{ error }` on failure
 *
 * @example
 * const { data } = await mutateFn(config, state, setState, "addTask", ["Buy milk"]);
 * console.log(data?.hash);
 *
 * // payable
 * await mutateFn(config, state, setState, "tip", [], { value: ethers.parseEther("0.01") });
 */
export async function mutateFn<
  TAbi extends AbiType,
  FnName extends ExtractAbiFunctionNames<TAbi, "nonpayable" | "payable">,
>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  setState: (partial: Partial<StoreType<TAbi>>) => void,
  functionName: FnName,
  args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
  options?: MutateOptionsType,
): Promise<{
  data?: {
    hash?: string;
    receipt?: ethers.TransactionReceipt;
  };
  error?: { message: string; raw: unknown };
}> {
  if (!state.wallet.isConnected) {
    return {
      error: { message: "Wallet not connected", raw: "Wallet not connected" },
    };
  }

  if (!config.chains.find((c) => c.id === state.wallet.chainId)) {
    return {
      error: {
        message: "Chain not supported",
        raw: `Chain ${state.wallet.chainId} not supported`,
      },
    };
  }

  try {
    const contract = await getContract(config, state, setState, true);
    const overrides = buildOverrides(options, state.wallet.address);

    // Simulate to surface revert reasons before broadcasting
    const revertReason = await simulateCall(
      config,
      state,
      functionName as string,
      args as unknown[],
      overrides,
    );
    if (revertReason) {
      return { error: { message: revertReason, raw: revertReason } };
    }

    if (options?.estimateGas) {
      overrides["gasLimit"] = await contract[functionName as string]!.estimateGas(
        ...(args as unknown[]),
        overrides,
      );
    }

    const tx: ethers.TransactionResponse = await contract[functionName as string]!(
      ...(args as unknown[]),
      overrides,
    );
    const receipt = await tx.wait();

    return { data: { hash: tx.hash, receipt: receipt ?? undefined } };
  } catch (error) {
    return { error: extractErrorMessage(error) };
  }
}
