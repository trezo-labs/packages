import { ethers } from "ethers";

export type QueryOptionsType = {
  from?: string;
  blockTag?: ethers.BlockTag;
  gasLimit?: bigint;
  value?: bigint;
};

export type MutateOptionsType = {
  from?: string;
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  value?: bigint;
  nonce?: number;
  estimateGas?: boolean; // optional gas estimation before sending
};
