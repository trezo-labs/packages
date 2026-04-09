"use client";

import React from "react";
import type { CommonButtonRenderProps } from "./button.type";

export type ConnectButtonProps = {
  label?: string;
  showBalance?: boolean;
  showAvatar?: boolean;
  balance?: "show" | "hide";
  disabled?: boolean;
  size?: "md" | "sm";
  namespace?: "eip155" | "solana" | "bip122";
  children?: (
    props: CommonButtonRenderProps & Record<string, any>,
  ) => React.ReactNode;
  [key: string]: any;
};

// Module-level cache — resolved once when Provider mounts
let _resolvedButton: React.FC<any> | null = null;
let _resolveListeners: Array<(btn: React.FC<any> | null) => void> = [];

/**
 * Registers the resolved ConnectButton component.
 * Called by `<Provider config={...}>` after the modal promise settles.
 * @internal
 */
export function _setResolvedButton(btn: React.FC<any> | null) {
  _resolvedButton = btn;
  _resolveListeners.forEach((fn) => fn(btn));
  _resolveListeners = [];
}

/**
 * <ConnectButton />
 *
 * Renders the wallet connect button for whichever modal provider
 * was configured in `create()`. Supports a render-prop `children`
 * for full UI customisation.
 *
 * Import from `@trezo/evm/react` — NOT from the root package.
 *
 * @example
 * import { ConnectButton } from "@trezo/evm/react";
 *
 * // Default button (kit-styled)
 * <ConnectButton />
 *
 * // Custom render
 * <ConnectButton>
 *   {({ isConnected, address, open }) => (
 *     <button onClick={() => open()}>
 *       {isConnected ? address : "Connect"}
 *     </button>
 *   )}
 * </ConnectButton>
 */
export function ConnectButton(props: ConnectButtonProps) {
  const [Btn, setBtn] = React.useState<React.FC<any> | null>(
    () => _resolvedButton,
  );
  const [ready, setReady] = React.useState(!!_resolvedButton);

  React.useEffect(() => {
    if (_resolvedButton) {
      setBtn(() => _resolvedButton);
      setReady(true);
      return;
    }
    const handler = (btn: React.FC<any> | null) => {
      setBtn(() => btn);
      setReady(true);
    };
    _resolveListeners.push(handler);
    return () => {
      _resolveListeners = _resolveListeners.filter((fn) => fn !== handler);
    };
  }, []);

  if (!ready || !Btn) return null;
  return <Btn {...props} />;
}
