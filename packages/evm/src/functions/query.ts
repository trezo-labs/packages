import { AbiType, CreateConfigType, QueryOptionsType } from "../core/config";
import { StoreType } from "../core/state";
import {
  EvmAbiFunctionArgsTuple,
  EvmAbiFunctionReturn,
  ExtractAbiFunctionNames,
} from "../core/types";
import {
  buildOverrides,
  extractErrorMessage,
  unwrapResult,
} from "../core/utils";
import { getContract, resolveAbiOutputs } from "../core/provider";

/**
 * Calls a read-only (view/pure) smart contract function.
 *
 * @param config - The trezo config created via `create()`
 * @param state  - Current store state snapshot
 * @param setState - Store state setter
 * @param functionName - ABI function name (autocompleted from ABI)
 * @param args - Tuple of arguments matching the ABI signature
 * @param options - Optional overrides (from, blockTag, gasLimit, value)
 *
 * @returns `{ data }` on success or `{ error }` on failure
 *
 * @example
 * const { data } = await queryFn(config, state, setState, "getTask", [BigInt(1)]);
 * const { data } = await queryFn(config, state, setState, "balanceOf", ["0xabc..."], { blockTag: "latest" });
 */
export async function queryFn<
  TAbi extends AbiType,
  FnName extends ExtractAbiFunctionNames<TAbi, "view" | "pure">,
>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  setState: (partial: Partial<StoreType<TAbi>>) => void,
  functionName: FnName,
  args: EvmAbiFunctionArgsTuple<TAbi, FnName>,
  options?: QueryOptionsType,
): Promise<{
  data?: EvmAbiFunctionReturn<TAbi, FnName>;
  error?: { message: string; raw: unknown };
}> {
  try {
    const contract = await getContract(config, state, setState, false);
    const overrides = buildOverrides(options, state.wallet.address);
    const abiOutputs = resolveAbiOutputs(config, functionName as string);

    const raw =
      Object.keys(overrides).length > 0
        ? await contract[functionName as string]!.staticCall(
            ...[...(args as unknown as unknown[])],
            overrides,
          )
        : await contract[functionName as string]!.staticCall(
            ...[...(args as unknown as unknown[])],
          );

    const data = unwrapResult(raw, abiOutputs) as EvmAbiFunctionReturn<
      TAbi,
      FnName
    >;
    return { data };
  } catch (error) {
    return { error: extractErrorMessage(error) };
  }
}
