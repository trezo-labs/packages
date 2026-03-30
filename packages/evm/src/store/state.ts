import { ethers } from "ethers";
import { Address } from "abitype";
import { AbiType } from "../types/config.type";

export type StoreType<TAbi extends AbiType> = {
  wallet: {
    isConnected: boolean;
    isConnecting: boolean;
    address?: Address;
    chainId?: number;
    error?: Error;
  };
  provider: {
    isAvailable: boolean;
    error?: Error;
  };
  // internal (not exposed to avoid re-renders)
  _signer?: ethers.Signer;
  _provider?: ethers.Provider;
  _contract?: ethers.Contract;
  _abi?: TAbi;
};

export const getInitialState = <TAbi extends AbiType>(): StoreType<TAbi> => ({
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
