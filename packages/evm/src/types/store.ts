import { ethers } from "ethers";

import { EvmAbiType } from "./abi";
import { EvmAddressType } from "./config";

export type EvmStoreType<TAbi extends EvmAbiType> = {
  wallet: {
    isConnected: boolean;
    isConnecting: boolean;
    address?: EvmAddressType;
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
