# @trezo/evm

A **high‑performance, type‑safe EVM state orchestration layer** for modern Web3 applications.

`@trezo/evm` provides a unified interface for **smart‑contract interactions**, **wallet connections**, and **reactive state management**, while keeping your application logic independent from specific wallet kits.

## Core Architecture

`@trezo/evm` is built around a **Factory Pattern** that generates a specialized hook and provider for your specific smart contract.

### Store Layer

A lightweight **Zustand-based store** that synchronizes:

- Wallet state
- Provider instances
- Contract abstractions

### Factory Layer

Generates **fully type-safe wrappers** for your contract ABI, ensuring:

- Compile‑time safety
- Autocomplete for contract functions
- Strict argument validation

### Kit Bridge

An abstraction layer that allows switching wallet kits without modifying application logic.

Supported kits can include:

- ConnectKit
- Reown (AppKit)
- Additional kits **coming soon**

### Dynamic Loading

Wallet kits and their heavy dependencies are **dynamically imported only when required**, ensuring:

- Minimal initial bundle size
- Faster page loads
- Better tree‑shaking

## Installation

Install using your preferred package manager.

```bash
pnpm add @trezo/evm
```

## Usage

### 1. Unified Configuration

Initialize your dApp by defining:

- Contract address
- Contract ABI
- Supported chains
- Wallet kit configuration

Each wallet kit may require **different configuration fields**.

### Example: ConnectKit

```ts
"use client"; // Required for Next.js

import { create, EvmChains } from "@trezo/evm";

const MyContractAbi = [...] as const;

export const evmConfig = create({
  address: "0x...",
  abi: MyContractAbi,
  chains: [EvmChains.optimismSepolia],
  kit: {
    name: "connectkit",
    config: {
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
      metadata: {
        appName: "Trezo Dapp",
        appIcon: "https://...",
        appDescription: "...",
        appUrl: "https://..."
      }
    }
  }
});

export const { Provider, ConnectButton } = evmConfig;
```

### Example: Reown (AppKit)

```ts
export const evmConfig = create({
  address: "0x...",
  abi: MyContractAbi,
  chains: [EvmChains.optimismSepolia],
  kit: {
    name: "reown",
    config: {
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID,
      ssr: true,
      metadata: {
        name: "Trezo",
        description: "...",
        url: "https://...",
        icons: ["https://..."],
      },
    },
  },
});

export const { Provider, ConnectButton } = evmConfig;
```

### 2. Provider Injection

Wrap your application (or a specific route) with the generated `Provider`.

This provider handles:

- Wallet kit initialization
- State synchronization
- Provider injection

```tsx
import { Provider } from "./evm.config";

export default function Layout({ children }) {
  return <Provider>{children}</Provider>;
}
```

### 3. Contract Orchestration (Hooks)

The `evmConfig()` hook exposes the reactive interface for interacting with:

- Smart contracts
- Wallet state
- Web3 provider

```ts
const { call, wallet, web3Provider } = evmConfig();
```

### Wallet State

Access wallet connection status and account details.

```ts
const { isConnected, isConnecting, address, chainId, error } = wallet.account;
```

The wallet state automatically updates when the user:

- Connects a wallet
- Switches accounts
- Changes networks

### Web3 Provider Availability

Check if the user has an injected wallet provider (MetaMask, Rabby, etc).

```ts
const { isAvailable, error } = web3Provider;

if (!isAvailable) {
  console.log("No wallet installed:", error?.message);
}
```

## Read Operations (Queries)

Execute **type-safe contract read operations**.

Arguments must match the ABI signature.

```ts
const result = await call.queryFn("getBalance", [address]);

if (result.data) {
  console.log(result.data);
}
```

Read operations use:

- Configured RPC URL
- OR the connected wallet provider

### Write Operations (Mutations)

Execute **state-changing transactions**.

These require a connected wallet.

```ts
const tx = await call.mutateFn("transfer", [to, amount]);

if (tx.data) {
  console.log("Transaction Hash:", tx.data.hash);
}
```

The orchestration layer automatically handles:

- Signer injection
- Gas estimation
- Transaction sending

### Real-time Event Listening

Listen to contract events with automatic polling fallback when RPC filters are not supported.

```ts
useEffect(() => {
  const unwatch = call.listenFn("Transfer", (from, to, value) => {
    console.log(`Transfer detected: ${value} from ${from} to ${to}`);
  });

  return () => unwatch();
}, []);
```

## 4. Custom ConnectButton (Render Props)

The default `ConnectButton` works out-of-the-box, but you can build fully custom UI using **render props**.

```tsx
import { formatAddress } from "@trezo/evm";

<ConnectButton>
  {({ isConnected, ensName, address, open }) => (
    <button onClick={open} className="custom-style">
      {isConnected ? (ensName ?? formatAddress(address)) : "Connect Wallet"}
    </button>
  )}
</ConnectButton>;
```

This allows complete control over:

- UI design
- Styling
- Button behavior

while still using the wallet kit's internal logic.

## Design Goals

`@trezo/evm` is designed to provide:

- Type-safe contract interactions
- Wallet-kit agnostic architecture
- Minimal bundle size
- Composable Web3 state
- Excellent developer experience

---
