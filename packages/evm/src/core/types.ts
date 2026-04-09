import type {
  Abi,
  Address,
  ExtractAbiFunctionNames,
  ExtractAbiFunction,
  AbiParametersToPrimitiveTypes,
  ExtractAbiEvent,
  ExtractAbiEventNames,
} from "abitype";

export type {
  Abi as AbiType,
  Address,
  ExtractAbiFunctionNames,
  ExtractAbiEventNames,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiEvent,
};

// Keep args as the direct abitype result — do NOT add a conditional wrapper.
// The conditional `extends readonly []` was widening the type to `readonly [] | []`
// which broke assignability when TypeScript tried to unify it with the mapped tuple.
export type EvmAbiFunctionArgsTuple<
  TAbi extends Abi,
  FnName extends ExtractAbiFunctionNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, FnName>["inputs"]>;

export type EvmAbiFunctionReturn<
  TAbi extends Abi,
  FnName extends ExtractAbiFunctionNames<TAbi>,
> = ExtractAbiFunction<TAbi, FnName>["outputs"] extends readonly []
  ? void
  : AbiParametersToPrimitiveTypes<
      ExtractAbiFunction<TAbi, FnName>["outputs"]
    >[0];

export type EvmAbiEventArgs<
  TAbi extends Abi,
  EventName extends string,
> = AbiParametersToPrimitiveTypes<ExtractAbiEvent<TAbi, EventName>["inputs"]>;
