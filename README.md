# Trezo

A multi-chain execution toolkit for frontend Web3 apps.

Trezo is an extensible, high-performance monorepo architecture designed for building modern decentralized applications (dApps). It provides a modular suite of tools that bridge the gap between low-level Web3 protocols and developer-centric interfaces.

## Core Packages

- **[@trezo/evm](https://github.com/thelastofinusa/trezo/tree/main/packages/evm/README.md)**: A specialized, type-safe orchestration layer for EVM blockchain integration. It features a pluggable wallet kit system (ConnectKit, Reown, etc.) and a reactive state management core.
- **trezo (CLI)**: The command-line interface for managing Trezo project lifecycles, scaffolding, and common Web3 operations.
- **website**: A high-performance reference implementation and documentation suite built with Next.js, showcasing the capabilities of the Trezo ecosystem.

## Design Philosophy

- **Type Safety First**: Full ABI-to-TypeScript orchestration ensures compile-time safety for all contract interactions.
- **Modular & Extensible**: A pluggable architecture for wallet kits and blockchain adapters, allowing developers to extend the ecosystem without modifying core logic.
- **Optimized Performance**: Dynamic loading and minimal dependency footprints ensure fast initial load times and high runtime efficiency.
- **Zero Configuration**: Sensible defaults and managed internal dependencies allow developers to focus on building features rather than wrestling with Web3 tooling.

## Getting Started

Trezo uses `pnpm` for optimized monorepo management.

```bash
# Clone and install dependencies
git clone https://github.com/thelastofinusa/trezo.git
cd trezo
pnpm install

# Build all workspace packages
pnpm -r build

# Start the reference website
cd website
pnpm dev
```

## Contributing

We welcome contributions! Please refer to the specific package READMEs for contribution guidelines and technical specifications.
