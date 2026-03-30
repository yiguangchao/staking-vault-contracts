# Staking Vault dApp

A full-stack Web3 staking demo project for learning and job preparation.

## Overview
This project includes:
- Smart contracts for staking and reward distribution
- A frontend dApp for wallet interaction
- A Node.js indexer for event syncing and query APIs

## Architecture
- `contracts/`: Solidity contracts and tests
- `app/`: Next.js frontend
- `indexer/`: Node.js indexer and API
- `docs/`: project documentation

## Features

### User Features
- Approve staking token
- Stake tokens
- Withdraw principal
- Claim rewards
- View earned rewards

### Admin Features
- Set reward rate
- Pause / unpause
- Fund reward pool

### Indexer Features
- Sync staking events
- Query event history
- Query user summaries

## Tech Stack
- Solidity
- Foundry
- OpenZeppelin
- TypeScript
- Node.js
- Next.js
- wagmi
- viem
- RainbowKit
- Prisma

## Local Development

### Contracts
```bash
cd contracts
forge build
forge test
```

### Frontend
```bash
cd app
pnpm install
pnpm dev
```

### Indexer
```bash
cd indexer
pnpm install
pnpm sync
pnpm dev
```

## Environment Variables

### app/.env.local
```bash
- NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
- NEXT_PUBLIC_STAKE_TOKEN_ADDRESS
- NEXT_PUBLIC_REWARD_TOKEN_ADDRESS
- NEXT_PUBLIC_VAULT_ADDRESS
```

### indexer/.env
- DATABASE_URL
- RPC_URL
- CHAIN_ID
- VAULT_ADDRESS
- START_BLOCK
- PORT

### Demo
- Add screenshots here
- Add Sepolia deployment info here

### Future Improvements
- Reward pool exhaustion protection
- Multi-pool support
- Fixed reward period
- Reorg handling in indexer