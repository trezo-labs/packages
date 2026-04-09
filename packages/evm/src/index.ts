// ── Core factory ────────────────────────────────────────────────────
export { create } from "./create";
export type { TrezoConfig } from "./create";

// ── Chain constants (re-exported from wagmi/chains) ─────────────────
export { Chains } from "./core/config";

// ── ABI / type utilities ─────────────────────────────────────────────
export type {
  AbiType,
  Address,
  ExtractAbiFunctionNames,
  ExtractAbiEventNames,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiEvent,
  EvmAbiFunctionArgsTuple,
  EvmAbiFunctionReturn,
  EvmAbiEventArgs,
} from "./core/types";

// ── Config types ─────────────────────────────────────────────────────
export type {
  CreateConfigType,
  QueryOptionsType,
  MutateOptionsType,
} from "./core/config";

// ── Modal config types ───────────────────────────────────────────────
export type { WalletConfigType } from "./modals";
export type { FamilyConfigType } from "./modals/from/family";
export type { ReownConfigType } from "./modals/from/reown";
