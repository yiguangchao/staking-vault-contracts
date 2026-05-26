# Contributing

This repo is a learning-friendly staking dApp project (Solidity + Foundry + Next.js + a small indexer). The goal of this guide is to make local dev and CI checks predictable.

## Quick Start

1. Install prerequisites:
- Node.js 20+
- pnpm 10+
- Foundry (`forge`, `anvil`)

2. Install dependencies:
```bash
cd app && pnpm install
cd ../indexer && pnpm install
```

3. Run the local chain:
```bash
anvil
```

Keep this terminal running while developing locally.

4. Deploy contracts (new terminal):
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

5. Run the frontend:
```bash
cd app
pnpm dev
```

6. Run the indexer (optional, for history panels):

Start the API:

```bash
cd indexer
pnpm dev
```

In another terminal, start the listener:

```bash
cd indexer
pnpm listener
```

The frontend and indexer expect the local chain to stay available while they are running.

## Local CI Parity

From repo root:
```bash
npm run ci:all
```

Individual checks:
```bash
npm run ci:contracts
npm run ci:indexer
npm run ci:app
```

## Notes For Windows

On some Windows setups, Next.js build may intermittently fail with `EPERM` errors due to file locks (often antivirus / real-time scanning). See the Troubleshooting section in `README.md` for mitigation tips.