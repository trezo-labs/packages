import type { AccountInterface, RpcProvider, Contract } from "starknet";
import type { StarknetAbiType } from "../types/abi.type";

export type StoreType<TAbi extends StarknetAbiType> = {
  wallet: {
    isConnected: boolean;
    isConnecting: boolean;
    address?: string;
    chainId?: bigint; // Starknet uses bigint chainIds
    error?: Error;
  };

  provider: {
    isAvailable: boolean;
    error?: Error;
  };

  _account?: AccountInterface;
  _provider?: RpcProvider;
  _contract?: Contract;
  _abi?: TAbi;
};

export const getInitialState = <
  TAbi extends StarknetAbiType,
>(): StoreType<TAbi> => ({
  wallet: {
    isConnected: false,
    isConnecting: false,
    address: undefined,
    chainId: undefined,
    error: undefined,
  },

  provider: {
    isAvailable:
      typeof window !== "undefined" &&
      typeof (window as any).starknet !== "undefined",
    error: undefined,
  },

  _account: undefined,
  _provider: undefined,
  _contract: undefined,
  _abi: undefined,
});
