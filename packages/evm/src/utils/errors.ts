/**
 * Throws an Error with a specified message.
 *
 * This utility can be used to enforce required parameters or invalid states.
 *
 * @param message - Optional custom error message. Defaults to `"An unexpected error occurred"`.
 *
 * @throws Always throws an `Error` with the provided message.
 *
 * @example
 * throwError("Invalid contract address");
 * // Throws Error: "Invalid contract address"
 *
 * @example
 * throwError();
 * // Throws Error: "An unexpected error occurred"
 */
export function throwError(message?: string): never {
  throw new Error(message ?? "An unexpected error occurred");
}

/**
 * mapEthersError
 * ------------------------------------------------------------
 * Converts low-level Ethers.js / RPC / wallet errors into
 * human-readable messages suitable for UI display.
 *
 * Ethereum libraries such as ethers.js emit structured errors
 * that include a `code` property. These codes represent
 * categories such as:
 *
 * - Blockchain execution errors
 * - Wallet interaction errors
 * - RPC/network failures
 * - Argument validation problems
 *
 * This utility normalizes those errors into friendly messages.
 *
 * References:
 * https://docs.ethers.org/v6/api/utils/errors/
 */

export const mapEthersError = (error: any): string => {
  if (!error) return "Unknown blockchain error.";

  const message = error.message?.toLowerCase?.() || "";

  /**
   * ------------------------------------------------------------
   * USER / WALLET ERRORS
   * ------------------------------------------------------------
   */

  // User rejected wallet request (Metamask / WalletConnect)
  if (error.code === "ACTION_REJECTED" || error.code === 4001) {
    return "Transaction was rejected in the wallet.";
  }

  // Request cancelled
  if (error.code === "CANCELLED") {
    return "The blockchain request was cancelled.";
  }

  /**
   * ------------------------------------------------------------
   * BLOCKCHAIN / TRANSACTION ERRORS
   * ------------------------------------------------------------
   */

  // Smart contract revert
  if (error.code === "CALL_EXCEPTION") {
    return `Smart contract execution reverted${
      error.reason ? `: ${error.reason}` : "."
    }`;
  }

  // Insufficient ETH for transaction
  if (
    error.code === "INSUFFICIENT_FUNDS" ||
    message.includes("insufficient funds")
  ) {
    return "Your wallet does not have enough ETH to pay for gas or value.";
  }

  // Nonce already used
  if (error.code === "NONCE_EXPIRED") {
    return "Transaction nonce is too low. Try resetting your wallet nonce.";
  }

  // Replacement transaction gas too low
  if (error.code === "REPLACEMENT_UNDERPRICED") {
    return "Replacement transaction gas price is too low.";
  }

  // Transaction replaced
  if (error.code === "TRANSACTION_REPLACED") {
    return "The transaction was replaced by another transaction.";
  }

  /**
   * ------------------------------------------------------------
   * NETWORK / RPC ERRORS
   * ------------------------------------------------------------
   */

  // Network failure
  if (error.code === "NETWORK_ERROR") {
    return "Network connection failed. Check your internet or RPC endpoint.";
  }

  // RPC server error
  if (error.code === "SERVER_ERROR") {
    return "Blockchain RPC server returned an error.";
  }

  // Request timeout
  if (error.code === "TIMEOUT") {
    return "Blockchain request timed out. Please try again.";
  }

  // Wrong network selected
  if (message.includes("network mismatch")) {
    return "Please switch to the correct blockchain network in your wallet.";
  }

  /**
   * ------------------------------------------------------------
   * ARGUMENT / DATA ERRORS
   * ------------------------------------------------------------
   */

  if (error.code === "INVALID_ARGUMENT") {
    return "Invalid argument passed to a blockchain function.";
  }

  if (error.code === "MISSING_ARGUMENT") {
    return "Missing required argument for blockchain call.";
  }

  if (error.code === "UNEXPECTED_ARGUMENT") {
    return "Unexpected argument passed to blockchain function.";
  }

  if (error.code === "VALUE_MISMATCH") {
    return "Provided values do not match the expected format.";
  }

  /**
   * ------------------------------------------------------------
   * DATA / DECODING ERRORS
   * ------------------------------------------------------------
   */

  if (error.code === "BAD_DATA") {
    return "Received malformed data from the blockchain.";
  }

  if (error.code === "BUFFER_OVERRUN") {
    return "Data buffer overflow occurred while decoding blockchain response.";
  }

  if (error.code === "NUMERIC_FAULT") {
    return "Numeric overflow or underflow occurred.";
  }

  /**
   * ------------------------------------------------------------
   * FEATURE / IMPLEMENTATION ERRORS
   * ------------------------------------------------------------
   */

  if (error.code === "NOT_IMPLEMENTED") {
    return "This blockchain operation is not implemented.";
  }

  if (error.code === "UNSUPPORTED_OPERATION") {
    return "This operation is not supported by the current provider.";
  }

  /**
   * ------------------------------------------------------------
   * ENS / NAME RESOLUTION ERRORS
   * ------------------------------------------------------------
   */

  if (error.code === "UNCONFIGURED_NAME") {
    return "ENS name is not configured correctly.";
  }

  /**
   * ------------------------------------------------------------
   * OFFCHAIN / ORACLE ERRORS
   * ------------------------------------------------------------
   */

  if (error.code === "OFFCHAIN_FAULT") {
    return "Off-chain data lookup failed.";
  }

  /**
   * ------------------------------------------------------------
   * GENERIC FALLBACK
   * ------------------------------------------------------------
   */

  if (error.code === "UNKNOWN_ERROR") {
    return "An unknown blockchain error occurred.";
  }

  return (
    error.reason || error.message || "An unexpected blockchain error occurred."
  );
};
