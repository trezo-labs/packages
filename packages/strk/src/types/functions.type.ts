import { BigNumberish } from "starknet";

export type QueryOptionsType = {
  blockIdentifier?: "latest" | "pending" | number;
  parseResponse?: boolean;
};

export type MutateOptionsType = {
  maxFee?: BigNumberish;
  nonce?: BigNumberish;

  parseRequest?: boolean;
  parseResponse?: boolean;

  waitForReceipt?: boolean;
};
