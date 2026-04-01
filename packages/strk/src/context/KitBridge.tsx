"use client";

import { useEffect } from "react";
import { useAccount } from "@starknet-react/core";

export type KitBridgeProps = {
  onConnect: (address: string, chainId: bigint, account: any) => void;
  onDisconnect: () => void;
};

export function KitBridge({ onConnect, onDisconnect }: KitBridgeProps) {
  const { address, chainId, isConnected, account } = useAccount();

  useEffect(() => {
    if (!isConnected || !address || !account) {
      onDisconnect();
      return;
    }

    onConnect(address, chainId ?? BigInt(0), account);
  }, [isConnected, address, chainId, account]);

  return null;
}
