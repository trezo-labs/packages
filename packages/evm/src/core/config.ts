import * as Chains from "wagmi/chains";
import { AbiType, Address } from "./types";
import { WalletConfigType } from "../modals";

export type { AbiType, Address };
export { Chains };
export type { WalletConfigType };

export type CreateConfigType<TAbi extends AbiType> = {
  abi: TAbi;
  address: Address;
  chains: [Chains.Chain, ...Chains.Chain[]];
  rpcUrls?: Record<number, string>;
  wallet: WalletConfigType;
};

export type FunctionOptions = {
  from?: string;
};

export type QueryOptionsType = FunctionOptions & {
  blockTag?: import("ethers").BlockTag;
  gasLimit?: bigint;
  value?: bigint;
};

export type MutateOptionsType = FunctionOptions & {
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
  nonce?: number;
  estimateGas?: boolean;
};
