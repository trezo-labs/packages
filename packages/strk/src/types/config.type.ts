import * as StarknetChains from "@starknet-react/chains";
import type { StarknetAbiType } from "./abi.type";
import { ModalConfigType } from "./modal.type";

type StarknetChainsType = typeof StarknetChains;

// ----------------------------------------------------------------
// Create config
// ----------------------------------------------------------------
export type CreateConfigType<TAbi extends StarknetAbiType> = {
  address: string;
  abi: TAbi;
  chains: [StarknetChains.Chain, ...StarknetChains.Chain[]];
  rpcUrls?: Record<string, string>; // keyed by chain network name
  modalConfig?: ModalConfigType;
};

export { type StarknetChainsType, StarknetChains };
