import { http, webSocket, fallback, Transport } from "wagmi";
import { ethers } from "ethers";
import { AbiType, CreateConfigType } from "./config";
import { QueryOptionsType, MutateOptionsType } from "./config";

/* ------------------------------------------------------------------ */
/* Transport                                                            */
/* ------------------------------------------------------------------ */

export function resolveTransport(
  chain: CreateConfigType<AbiType>["chains"][number],
  rpcUrls?: CreateConfigType<AbiType>["rpcUrls"],
): Transport {
  const userRpc = rpcUrls?.[chain.id];
  const httpUrl = userRpc ?? chain.rpcUrls.default.http[0];
  const wsUrl = chain.rpcUrls.default.webSocket?.[0];

  if (wsUrl && !userRpc) {
    return fallback([webSocket(wsUrl), http(httpUrl)]);
  }

  return http(httpUrl);
}

/* ------------------------------------------------------------------ */
/* Error helpers                                                        */
/* ------------------------------------------------------------------ */

export function throwError(message?: string): never {
  throw new Error(message ?? "An unexpected error occurred");
}

export function extractErrorMessage(error: unknown): {
  message: string;
  raw: unknown;
} {
  const errMsg = error instanceof Error ? error.message : "Unknown error";
  if (!error || !(error instanceof Error)) {
    return { message: errMsg, raw: error };
  }

  const err = error as any;

  // Direct revert reason
  if (err?.revert?.args?.[0]) {
    return { message: String(err.revert.args[0]), raw: error };
  }
  if (err?.reason) {
    return { message: err.reason, raw: error };
  }

  // Nested provider messages
  const candidates = [
    err?.data?.message,
    err?.error?.data?.message,
    err?.error?.message,
    err?.info?.error?.data?.message,
    err?.info?.error?.message,
  ];

  for (const msg of candidates) {
    if (typeof msg === "string" && msg.length > 0) {
      return { message: msg, raw: error };
    }
  }

  // Decode raw ABI revert data
  const rawData =
    err?.data?.data ?? err?.error?.data?.data ?? err?.data ?? err?.error?.data;

  if (typeof rawData === "string" && rawData.startsWith("0x08c379a0")) {
    try {
      const iface = new ethers.Interface(["function Error(string)"]);
      const decoded = iface.decodeFunctionData("Error", rawData);
      return { message: decoded[0] as string, raw: error };
    } catch {
      // ignore
    }
  }

  return { message: errMsg, raw: error };
}

/* ------------------------------------------------------------------ */
/* Call overrides                                                       */
/* ------------------------------------------------------------------ */

export function buildOverrides(
  options?: QueryOptionsType | MutateOptionsType,
  fallbackFrom?: string,
) {
  const overrides: Record<string, unknown> = {};
  const from = (options as any)?.from ?? fallbackFrom;

  if (from) overrides["from"] = from;
  if (options?.value) overrides["value"] = options.value;
  if (options?.gasLimit) overrides["gasLimit"] = options.gasLimit;
  if ((options as QueryOptionsType)?.blockTag)
    overrides["blockTag"] = (options as QueryOptionsType).blockTag;
  if ((options as MutateOptionsType)?.nonce)
    overrides["nonce"] = (options as MutateOptionsType).nonce;
  if ((options as MutateOptionsType)?.gasPrice)
    overrides["gasPrice"] = (options as MutateOptionsType).gasPrice;
  if ((options as MutateOptionsType)?.maxFeePerGas)
    overrides["maxFeePerGas"] = (options as MutateOptionsType).maxFeePerGas;
  if ((options as MutateOptionsType)?.maxPriorityFeePerGas)
    overrides["maxPriorityFeePerGas"] = (
      options as MutateOptionsType
    ).maxPriorityFeePerGas;

  return overrides;
}

/* ------------------------------------------------------------------ */
/* Result unwrapping                                                    */
/* ------------------------------------------------------------------ */

export function unwrapResult(result: any, abiOutputs?: any[]): any {
  if (!Array.isArray(result)) return result;

  if (abiOutputs && abiOutputs.length > 0) {
    if (abiOutputs.length === 1 && abiOutputs[0].type === "tuple[]") {
      return Array.from(result).map((item: any) =>
        unwrapResult(item, abiOutputs[0].components),
      );
    }

    if (
      abiOutputs[0]?.type === "tuple" ||
      (abiOutputs[0]?.name && result.length === abiOutputs.length)
    ) {
      return Object.fromEntries(
        abiOutputs.map((output: any, i: number) => [
          output.name ?? i,
          unwrapResult(result[i], output.components),
        ]),
      );
    }

    if (abiOutputs.every((o: any) => o.name)) {
      return Object.fromEntries(
        abiOutputs.map((output: any, i: number) => [
          output.name,
          unwrapResult(result[i], output.components),
        ]),
      );
    }
  }

  return Array.from(result).map((item: any) => unwrapResult(item));
}
