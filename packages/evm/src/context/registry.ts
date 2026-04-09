import { AbiType } from "@/core/types";
import { TrezoStore } from "@/store/store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _activeStore: TrezoStore<any> | null = null;

/**
 * Registers the store created by `create()`.
 * Called internally — do not call this manually.
 */
export function registerStore<TAbi extends AbiType>(store: TrezoStore<TAbi>) {
  _activeStore = store as TrezoStore<any>;
}

/**
 * Returns the active store registered by `create()`.
 * Used by framework adapters (`useConfig`, Angular service, Vue composable…).
 *
 * @throws if no config has been registered yet
 */
export function getActiveStore<TAbi extends AbiType>(): TrezoStore<TAbi> {
  if (!_activeStore) {
    throw new Error(
      "[trezo/evm] No config registered. " +
        "Make sure `create()` is called and the returned config is passed to <Provider config={...}>.",
    );
  }
  return _activeStore as TrezoStore<TAbi>;
}
