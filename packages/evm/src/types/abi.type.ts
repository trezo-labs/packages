import type {
  Abi,
  Address,
  ExtractAbiFunctionNames,
  ExtractAbiEventNames,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiEvent,
  AbiParameterToPrimitiveType,
} from "abitype";

export type {
  Abi,
  Address,
  ExtractAbiFunctionNames,
  ExtractAbiEventNames,
  AbiParametersToPrimitiveTypes,
  ExtractAbiFunction,
  ExtractAbiEvent,
  AbiParameterToPrimitiveType,
};

export type EvmAbiType = Abi;

// Tuple of arguments for a given function
export type EvmAbiFunctionArgsTuple<
  TAbi extends Abi,
  FnName extends ExtractAbiFunctionNames<TAbi>,
> = AbiParametersToPrimitiveTypes<ExtractAbiFunction<TAbi, FnName>["inputs"]>;

// Return type for view/pure functions
export type EvmAbiFunctionReturn<
  TAbi extends EvmAbiType,
  FnName extends ExtractAbiFunctionNames<TAbi>,
> = ExtractAbiFunction<TAbi, FnName>["outputs"] extends readonly []
  ? void
  : AbiParametersToPrimitiveTypes<
      ExtractAbiFunction<TAbi, FnName>["outputs"]
    >[0];
