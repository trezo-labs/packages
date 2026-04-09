import { ethers } from "ethers";

interface PollConfig {
  provider: ethers.Provider;
  contract: ethers.Contract;
  eventName: string;
  intervalMs?: number;
}

/**
 * Manually polls for logs when eth_newFilter is unavailable
 * (e.g. Alchemy, Infura free tier, public RPCs).
 */
export function createEventPoller(
  { provider, contract, eventName, intervalMs = 5_000 }: PollConfig,
  listener: (...args: unknown[]) => void,
): () => void {
  let lastBlock: number;

  const poll = async () => {
    try {
      const currentBlock = await provider.getBlockNumber();
      if (!lastBlock) {
        lastBlock = currentBlock;
        return;
      }

      if (currentBlock > lastBlock) {
        const logs = await provider.getLogs({
          address: await contract.getAddress(),
          fromBlock: lastBlock + 1,
          toBlock: currentBlock,
          topics: [contract.interface.getEvent(eventName)!.topicHash],
        });

        logs.forEach((log) => {
          const parsed = contract.interface.parseLog(log);
          if (parsed) listener(...parsed.args);
        });

        lastBlock = currentBlock;
      }
    } catch (err) {
      console.error("[trezo/evm] Event polling error:", err);
    }
  };

  const intervalId = setInterval(poll, intervalMs);
  return () => clearInterval(intervalId);
}
