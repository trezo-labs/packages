import { ethers } from "ethers";
import { throwError } from "./errors";

/**
 * Converts a value from Wei to Ether.
 *
 * Uses `ethers.formatEther` to format the smallest Ethereum unit (Wei)
 * into a human-readable Ether value.
 *
 * @param num - The value in Wei.
 *
 * @returns A string representing the value converted to Ether.
 *
 * @example
 * fromWei(1000000000000000000)
 * // "1.0"
 */
export const fromWei = (
  value: bigint | string | number,
  decimals = 18,
): string => ethers.formatUnits(value.toString(), decimals);

/**
 * Converts a value from Ether to Wei.
 *
 * Uses `ethers.parseEther` to convert a human-readable Ether value
 * into Wei, the smallest Ethereum unit.
 *
 * @param num - The Ether value to convert.
 *
 * @returns A bigint representing the value in Wei.
 *
 * @example
 * toWei(1)
 * // 1000000000000000000n
 */
export const toWei = (value: string, decimals = 18): bigint =>
  ethers.parseUnits(value, decimals);

/**
 * Formats an Ethereum address into a shortened, human-readable string.
 *
 * Keeps the first 4 characters of the address and a specified number of characters at the end.
 * The middle (or end) can be replaced with a custom separator. Supported separators
 * are `"..."`, `"-"`, `">"`, `"→"`.
 *
 * @param address - The full Ethereum address to format.
 * @param options - Optional formatting options:
 *   - `endChars` - Number of characters to keep at the end (default `6`).
 *   - `separator` - String to place between start and end. Suggestions: `"..." | "-" | ">" | "→"` (default `"..."`).
 *   - `position` - `"middle"` (default) or `"end"`. `"end"` appends the separator after the start characters.
 *
 * @returns The formatted address string.
 *
 * @example
 * formatAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e")
 * // "0x74d3...38f44e"
 *
 * @example
 * formatAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", { endChars: 4, separator: "→" })
 * // "0x74d3→f44e"
 *
 * @example
 * formatAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", { endChars: 0, separator: "...", position: "end" })
 * // "0x74d3..."
 */
export function formatAddress(
  address: string,
  options?: {
    endChars?: number;
    separator?: "..." | "-" | ">" | "→";
    position?: "middle" | "end";
  },
): string {
  if (!address) throwError("formatAddress: address is required");

  const endChars = options?.endChars ?? 6;
  const separator = options?.separator ?? "...";
  const position = options?.position ?? "middle";

  const start = address.slice(0, 4);
  const end = address.slice(-endChars);

  if (position === "end") {
    return `${start}${separator}`;
  }

  // Default "middle" truncation
  return `${start}${separator}${end}`;
}
