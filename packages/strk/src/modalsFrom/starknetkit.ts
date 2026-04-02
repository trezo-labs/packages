import { voyager, starkscan, viewblock } from "@starknet-react/core";
import type { StarknetkitConnector } from "starknetkit";
import { StarknetChains } from "../types/config.type";

// ---------------------------------------------
// Explorers
// ---------------------------------------------

export const explorers = {
  voyager,
  starkscan,
  viewblock,
} as const;

export type ExplorerKey = keyof typeof explorers;

// ---------------------------------------------
// Config Types
// ---------------------------------------------

export type StarknetkitConfigType = {
  // -------------------------------------------
  // Network / Provider
  // -------------------------------------------
  network?: {
    provider?: "public" | "jsonRpc";
    defaultChain?: StarknetChains.Chain;
  };

  // -------------------------------------------
  // Connection Behavior
  // -------------------------------------------
  connection?: {
    autoConnect?: boolean;
    connectors?: StarknetkitConnector[];
  };

  // -------------------------------------------
  // Wallet Options
  // -------------------------------------------
  wallets?: {
    enabled?: (
      | "argent"
      | "braavos"
      | "metamask"
      | "webwallet"
      | "controller"
    )[];
    webWallet?: boolean;
    webWalletUrl?: string;
    controller?: boolean;
  };

  // -------------------------------------------
  // UI / Modal
  // -------------------------------------------
  ui?: {
    modalTheme?: "light" | "dark" | "system";
    modalMode?: "neverAsk" | "canAsk" | "alwaysAsk";
    dappName?: string;
  };

  // -------------------------------------------
  // Explorer
  // -------------------------------------------
  explorer?: ExplorerKey;
};
