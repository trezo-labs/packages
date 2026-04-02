import { RpcProvider, constants } from "starknet";

export const ETHTokenAddress =
  "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export const STRKTokenAddress =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export const DAITokenAddress =
  "0x00da114221cb83fa859dbdb4c44beeaa0bb37c7537ad5ae66fe5e0efd20e6eb3";

export const CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID === constants.NetworkName.SN_MAIN
    ? constants.NetworkName.SN_MAIN
    : constants.NetworkName.SN_SEPOLIA;

const NODE_URL =
  process.env.NEXT_PUBLIC_CHAIN_ID === constants.NetworkName.SN_MAIN
    ? "https://rpc.starknet.lava.build"
    : "https://rpc.starknet-sepolia.lava.build";

const STARKNET_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID === constants.NetworkName.SN_MAIN
    ? constants.StarknetChainId.SN_MAIN
    : constants.StarknetChainId.SN_SEPOLIA;

export const IS_MAINNET =
  process.env.NEXT_PUBLIC_CHAIN_ID === constants.NetworkName.SN_MAIN;

export const provider = new RpcProvider({
  specVersion: "0.9.0",
  nodeUrl: NODE_URL,
  chainId: STARKNET_CHAIN_ID,
});

export const ARGENT_SESSION_SERVICE_BASE_URL =
  "https://cloud.argent-api.com/v1";

export const ARGENT_WEBWALLET_URL = "https://sepolia-web.argent.xyz";
