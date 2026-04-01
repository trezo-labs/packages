import type { Abi, BigNumberish } from "starknet";

// ----------------------------------------------------------------
// Base ABI type (use Starknet's real ABI)
// ----------------------------------------------------------------
export type StarknetAbiType = Abi;

// ----------------------------------------------------------------
// Utility: extract ABI entries
// ----------------------------------------------------------------
type AbiEntry<TAbi extends Abi> = TAbi[number];

// ----------------------------------------------------------------
// Function extraction (includes interface items)
// ----------------------------------------------------------------
type AbiFunction<TAbi extends Abi> = Extract<
  AbiEntry<TAbi>,
  { type: "function" }
>;

type AbiInterfaceFunction<TAbi extends Abi> = Extract<
  AbiEntry<TAbi>,
  { type: "interface" }
>["items"][number];

type ExtractFunctions<TAbi extends Abi> =
  | AbiFunction<TAbi>
  | AbiInterfaceFunction<TAbi>;

// ----------------------------------------------------------------
// Event extraction
// ----------------------------------------------------------------
type AbiEvent<TAbi extends Abi> = Extract<AbiEntry<TAbi>, { type: "event" }>;

export type ExtractStarknetEventNames<TAbi extends Abi> =
  AbiEvent<TAbi>["name"];

export type ExtractStarknetEvent<
  TAbi extends Abi,
  TName extends string,
> = Extract<AbiEvent<TAbi>, { name: TName }>;

// ----------------------------------------------------------------
// Function name extraction
// ----------------------------------------------------------------
export type ExtractStarknetFunctionNames<
  TAbi extends Abi,
  TStateMutability extends "view" | "external",
> = Extract<
  ExtractFunctions<TAbi>,
  { state_mutability: TStateMutability }
>["name"];

// ----------------------------------------------------------------
// Function extraction by name
// ----------------------------------------------------------------
export type ExtractStarknetFunction<
  TAbi extends Abi,
  TName extends string,
> = Extract<ExtractFunctions<TAbi>, { name: TName }>;

// ----------------------------------------------------------------
// Type mapping: Cairo → TS input types
// ----------------------------------------------------------------
type StarknetTypeToInput<T extends string> =
  // bool
  T extends "core::bool" | "bool"
    ? boolean
    : // numeric inputs
      T extends
          | "core::integer::u8"
          | "core::integer::u16"
          | "core::integer::u32"
          | "core::integer::u64"
          | "core::integer::u128"
          | "core::integer::u256"
          | "core::integer::i8"
          | "core::integer::i16"
          | "core::integer::i32"
          | "core::integer::i64"
          | "core::integer::i128"
          | "u8"
          | "u16"
          | "u32"
          | "u64"
          | "u128"
          | "u256"
      ? BigNumberish
      : // addresses / hashes
        T extends
            | "core::felt252"
            | "felt252"
            | "core::starknet::contract_address::ContractAddress"
            | "core::starknet::class_hash::ClassHash"
            | "ContractAddress"
            | "ClassHash"
        ? string
        : // collections
          T extends `core::array::Array::<${string}>`
          ? unknown[]
          : T extends `core::option::Option::<${string}>`
            ? unknown | undefined
            : unknown;

// ----------------------------------------------------------------
// Type mapping: Cairo → TS output types
// ----------------------------------------------------------------
type StarknetTypeToOutput<T extends string> =
  // bool
  T extends "core::bool" | "bool"
    ? boolean
    : // numeric outputs always bigint
      T extends
          | "core::integer::u8"
          | "core::integer::u16"
          | "core::integer::u32"
          | "core::integer::u64"
          | "core::integer::u128"
          | "core::integer::u256"
          | "core::integer::i8"
          | "core::integer::i16"
          | "core::integer::i32"
          | "core::integer::i64"
          | "core::integer::i128"
          | "u8"
          | "u16"
          | "u32"
          | "u64"
          | "u128"
          | "u256"
      ? bigint
      : // addresses / hashes
        T extends
            | "core::felt252"
            | "felt252"
            | "core::starknet::contract_address::ContractAddress"
            | "core::starknet::class_hash::ClassHash"
            | "ContractAddress"
            | "ClassHash"
        ? string
        : // collections
          T extends `core::array::Array::<${string}>`
          ? unknown[]
          : unknown;

// ----------------------------------------------------------------
// Build args tuple from function inputs
// ----------------------------------------------------------------
type MapInputs<T extends readonly { type: string }[]> = {
  [K in keyof T]: T[K] extends { type: infer U extends string }
    ? StarknetTypeToInput<U>
    : never;
};

export type StarknetFunctionArgs<TAbi extends Abi, TName extends string> =
  ExtractStarknetFunction<TAbi, TName> extends { inputs: infer I }
    ? I extends readonly { type: string }[]
      ? MapInputs<I>
      : []
    : [];

// ----------------------------------------------------------------
// Build return type from function outputs
// ----------------------------------------------------------------
export type StarknetFunctionReturn<TAbi extends Abi, TName extends string> =
  ExtractStarknetFunction<TAbi, TName> extends infer Fn
    ? Fn extends { outputs: readonly [] }
      ? void
      : Fn extends { outputs: readonly { type: string }[] }
        ? Fn["outputs"][number] extends { type: infer T extends string }
          ? StarknetTypeToOutput<T>
          : {
              [K in keyof Fn["outputs"]]: Fn["outputs"][K] extends {
                type: infer T2 extends string;
              }
                ? StarknetTypeToOutput<T2>
                : unknown;
            }
        : unknown
    : unknown;

// ----------------------------------------------------------------
// Event args (struct + enum support, simplified but safe)
// ----------------------------------------------------------------
export type StarknetEventArgs<TAbi extends Abi, TName extends string> =
  ExtractStarknetEvent<TAbi, TName> extends infer Ev
    ? Ev extends { kind: "struct"; members: readonly { type: string }[] }
      ? {
          [K in keyof Ev["members"]]: Ev["members"][K] extends {
            type: infer T extends string;
          }
            ? StarknetTypeToOutput<T>
            : unknown;
        }
      : Ev extends { kind: "enum"; variants: readonly { type: string }[] }
        ? {
            [K in keyof Ev["variants"]]: Ev["variants"][K] extends {
              type: infer T extends string;
            }
              ? StarknetTypeToOutput<T>
              : unknown;
          }
        : []
    : [];
