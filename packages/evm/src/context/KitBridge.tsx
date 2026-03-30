"use client";

import { useEffect } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { ethers } from "ethers";

export type KitBridgeProps = {
  onConnect: (address: string, chainId: number, signer: ethers.Signer) => void;
  onDisconnect: () => void;
};

/**
 * KitBridge
 * ---------------------------------------------------------
 * Mounted inside the kit provider tree. Listens to wagmi's
 * account/walletClient state and pushes it into the trezo
 * store so queryFn / mutateFn work without any changes.
 *
 * This is a renderless component — returns null always.
 */

export function KitBridge({ onConnect, onDisconnect }: KitBridgeProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (!isConnected || !address || !chainId || !walletClient) {
      onDisconnect();
      return;
    }

    const provider = new ethers.BrowserProvider(walletClient as any);
    provider.getSigner().then((signer) => {
      onConnect(address, chainId, signer);
    });
  }, [isConnected, address, chainId, walletClient]);

  return null;
}
