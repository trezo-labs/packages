import * as Chains from "wagmi/chains";

import { ModalConfigType } from "./modal.type";
import { Abi as AbiType, Address as AddressType } from "./abi.type";

type ChainsType = typeof Chains;

export type CreateConfigType<TAbi extends AbiType> = {
  abi: TAbi;
  address: AddressType;
  chains: [Chains.Chain, ...Chains.Chain[]];
  rpcUrls?: Record<number, string>;
  modalConfig: ModalConfigType;
};

export { type AbiType, type AddressType, type ChainsType, Chains };
