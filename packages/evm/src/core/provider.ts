import { ethers } from "ethers";
import { StoreType } from "./state";
import { AbiType, CreateConfigType } from "./config";
import { throwError } from "./utils";

/* ------------------------------------------------------------------ */
/* RPC resolution                                                       */
/* ------------------------------------------------------------------ */

export function resolveRpcUrl<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
): string | undefined {
  const chainId = state.wallet.chainId ?? config.chains?.[0]?.id;
  const userRpc = config.rpcUrls?.[chainId!];
  const defaultRpc = config.chains?.find((c) => c.id === chainId)?.rpcUrls
    .default.http[0];
  return userRpc ?? defaultRpc;
}

/* ------------------------------------------------------------------ */
/* Provider                                                             */
/* ------------------------------------------------------------------ */

export function getProvider<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  setState: (partial: Partial<StoreType<TAbi>>) => void,
): ethers.Provider {
  if (state._signer?.provider) return state._signer.provider;
  if (state._provider) return state._provider;

  const rpcUrl = resolveRpcUrl(config, state);
  if (rpcUrl) {
    const provider = rpcUrl.startsWith("wss")
      ? new ethers.WebSocketProvider(rpcUrl)
      : new ethers.JsonRpcProvider(rpcUrl);
    setState({ _provider: provider });
    return provider;
  }

  if (typeof window !== "undefined" && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    setState({ _provider: provider });
    return provider;
  }

  return throwError("No provider available");
}

/* ------------------------------------------------------------------ */
/* Signer                                                               */
/* ------------------------------------------------------------------ */

export async function getSigner<TAbi extends AbiType>(
  state: StoreType<TAbi>,
  setState: (partial: Partial<StoreType<TAbi>>) => void,
): Promise<ethers.Signer> {
  if (state._signer) return state._signer;

  if (
    state.wallet.isConnected &&
    typeof window !== "undefined" &&
    window.ethereum
  ) {
    const provider = new ethers.BrowserProvider(window.ethereum as any);
    const signer = await provider.getSigner();
    setState({ _signer: signer });
    return signer;
  }

  return throwError("No signer available. Connect a wallet first.");
}

/* ------------------------------------------------------------------ */
/* Contract factory                                                     */
/* ------------------------------------------------------------------ */

export async function getContract<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
  state: StoreType<TAbi>,
  setState: (partial: Partial<StoreType<TAbi>>) => void,
  forWrite = false,
): Promise<ethers.Contract> {
  const runner = forWrite
    ? await getSigner(state, setState)
    : getProvider(config, state, setState);

  return new ethers.Contract(
    config.address,
    config.abi as ethers.InterfaceAbi,
    runner,
  );
}

/* ------------------------------------------------------------------ */
/* ABI helpers                                                          */
/* ------------------------------------------------------------------ */

export function resolveAbiOutputs<TAbi extends AbiType>(
  config: CreateConfigType<TAbi>,
  functionName: string,
) {
  return (config.abi as unknown as any[]).find(
    (item) => item.type === "function" && item.name === functionName,
  )?.outputs;
}
