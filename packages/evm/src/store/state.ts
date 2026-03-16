import { EvmAbiType } from "../types/abi";
import { EvmStoreType } from "../types/store";

export const getInitialState = <
  TAbi extends EvmAbiType,
>(): EvmStoreType<TAbi> => ({
  wallet: {
    isConnected: false,
    isConnecting: false,
    address: undefined,
    chainId: undefined,
    error: undefined,
  },
  provider: {
    isAvailable: typeof window !== "undefined" && !!window.ethereum,
    error: undefined,
  },
  _signer: undefined,
  _provider: undefined,
  _contract: undefined,
  _abi: undefined,
});
