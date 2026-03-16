"use client";

import { useEffect } from "react";
import { useAccount, useWalletClient } from "wagmi";
import { ethers } from "ethers";

/**
 * KitBridge
 * ---------------------------------------------------------
 * Mounted inside the kit provider tree. Listens to wagmi's
 * account/walletClient state and pushes it into the trezo
 * store so queryFn / mutateFn work without any changes.
 *
 * This is a renderless component — returns null always.
 */
export function KitBridge({
  onConnect,
  onDisconnect,
}: {
  onConnect: (address: string, chainId: number, signer: ethers.Signer) => void;
  onDisconnect: () => void;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    if (!isConnected || !address || !chainId || !walletClient) {
      onDisconnect();
      return;
    }

    // Convert viem WalletClient → ethers Signer
    // wagmi v2 + viem: walletClient is already EIP-1193 compatible
    const provider = new ethers.BrowserProvider(walletClient as any);
    provider.getSigner().then((signer) => {
      onConnect(address, chainId, signer);
    });
  }, [isConnected, address, chainId, walletClient]);

  return null;
}
