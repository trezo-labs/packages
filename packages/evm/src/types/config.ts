import * as Chains from "viem/chains";
import type { Address } from "abitype";

import { EvmAbiType } from "./abi";
import { EvmKitConfigType } from "./kit";

export const EvmChains = Chains;

export type EvmAddressType = Address;
export type EvmChainsType = typeof EvmChains;

export type EvmConfigType<TAbi extends EvmAbiType> = {
  abi: TAbi;
  address: EvmAddressType;
  chains: [Chains.Chain, ...Chains.Chain[]];
  rpcUrl?: string;
  kit: EvmKitConfigType;
};
