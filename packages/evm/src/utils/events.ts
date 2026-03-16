import { ethers } from "ethers";

interface PollConfig {
  provider: ethers.Provider;
  contract: ethers.Contract;
  eventName: string;
  intervalMs?: number;
}

/**
 * Manually polls for logs when eth_newFilter is unavailable
 */
export const createEventPoller = (
  { provider, contract, eventName, intervalMs = 5000 }: PollConfig,
  listener: (...args: any[]) => void,
) => {
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
      console.error("Event Polling Error:", err);
    }
  };

  const intervalId = setInterval(poll, intervalMs);
  return () => clearInterval(intervalId);
};
