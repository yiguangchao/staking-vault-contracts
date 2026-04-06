# Staking Vault dApp

A full-stack Web3 staking demo built with Solidity, Foundry, Next.js, wagmi, viem, and a lightweight Node.js indexer. The project covers the complete user flow from token approval to staking, reward accrual, reward claiming, and admin controls.

## What This Project Includes

- Smart contracts for staking, rewards, role-based admin actions, and emergency pause control
- A frontend dApp for wallet connection, contract reads and writes, and transaction feedback
- A Node.js indexer and API for event history and user summary data
- Project diagrams under [`docs/`](./docs) for flow explanations, architecture, and UI walkthroughs

## Core Features

### User Features
- Approve the staking token for the vault
- Stake tokens into the vault
- Withdraw staked principal
- Claim accumulated rewards
- View wallet balance, allowance, vault balance, earned rewards, and transaction status

### Admin Features
- Set the reward rate per second
- Pause the protocol in emergency situations
- Unpause the protocol after recovery

### Indexer Features
- Sync vault events from chain data
- Expose recent user events
- Expose user summary snapshots
- Expose reward rate change history

## Project Structure

- `src/`
  Solidity contracts
- `test/`
  Foundry contract tests
- `script/`
  Deployment scripts
- `app/`
  Next.js frontend dApp
- `indexer/`
  Event listener, sync jobs, Express API, Prisma schema
- `docs/`
  Architecture diagrams, flow diagrams, and interview prep materials

## Main Contracts

### `BootcampToken.sol`
ERC20 token used as both the staking token and reward token in the local demo setup.

### `StakingVault.sol`
Core vault logic:
- `stake(uint256 amount)`
- `withdraw(uint256 amount)`
- `claimRewards()`
- `setRewardRate(uint256 newRewardRate)`
- `pause()` / `unpause()`

Security modules used:
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`

## Main User Flow

1. Connect wallet
2. Approve the staking token for the vault
3. Stake tokens
4. Wait for rewards to accrue
5. Claim rewards or withdraw principal

Important notes:
- `Approve` grants spending permission to the vault. It does not move tokens.
- `Stake` is the action that actually transfers tokens into the vault.
- `My Earned Rewards` shows claimable rewards, not rewards already transferred to the wallet.
- On a local Foundry chain, rewards only move when new blocks are mined.

## Architecture Overview

### On-chain
- `BootcampToken` stores token balances and allowances
- `StakingVault` stores staking balances, reward state, and admin-controlled protocol state

### Frontend
- Connects wallets via RainbowKit
- Reads contract state with wagmi and viem
- Sends write transactions and tracks confirmation status
- Displays user and admin dashboards

### Indexer
- Listens to `Staked`, `Withdrawn`, `RewardPaid`, and `RewardRateUpdated`
- Persists indexed data with Prisma
- Serves API routes for event history and user summaries

## Local Development

### 1. Install dependencies

Frontend:
```bash
cd app
pnpm install
```

Indexer:
```bash
cd indexer
pnpm install
```

### 2. Run the local chain

Start your local Foundry/Anvil chain on `http://127.0.0.1:8545`.

### 3. Deploy contracts

From the repo root:
```bash
forge build
forge test
```

Use the deployment script in `script/Deploy.s.sol` to deploy local contracts if needed.

### 4. Start the frontend

```bash
cd app
pnpm dev
```

Frontend default URL:
- `http://localhost:3000`

### 5. Start the indexer API

```bash
cd indexer
pnpm dev
```

### 6. Start the indexer listener

In another terminal:
```bash
cd indexer
pnpm listener
```

### 7. Optional historical sync

```bash
cd indexer
pnpm sync
```

## Environment Variables

### Root `.env`
Used by local deployment and chain-related scripts.

Example values:
```bash
PRIVATE_KEY=...
SEPOLIA_RPC_URL=...
ETHERSCAN_API_KEY=...
```

### `app/.env.local`
```bash
NEXT_PUBLIC_APP_CHAIN=localhost
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_LOCAL_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_STAKE_TOKEN_ADDRESS=...
NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=...
NEXT_PUBLIC_VAULT_ADDRESS=...
NEXT_PUBLIC_INDEXER_API_URL=http://localhost:4000
```

### `indexer/.env`
```bash
DATABASE_URL=...
RPC_URL=...
CHAIN_ID=31337
VAULT_ADDRESS=...
START_BLOCK=...
PORT=4000
```

## Testing

Run the contract tests:
```bash
forge test -vv
```

Run frontend linting:
```bash
cd app
npm run lint
```

## Documentation Assets

Useful diagrams and notes:
- [`docs/staking-flow-overview.svg`](./docs/staking-flow-overview.svg)
- [`docs/admin-flow-overview.svg`](./docs/admin-flow-overview.svg)
- [`docs/system-architecture-overview.svg`](./docs/system-architecture-overview.svg)
- [`docs/page-button-guide.svg`](./docs/page-button-guide.svg)
- [`docs/interview-qa.md`](./docs/interview-qa.md)
- [`docs/remote-dapp-job-readiness.md`](./docs/remote-dapp-job-readiness.md)

## Current Limitations / Next Steps

This project is strong as a portfolio-quality demo, but it is not production-ready yet. Major future improvements include:

- Better reward pool management
- More complete frontend validation and UX polish
- Full cleanup of historical UI copy and localization
- More advanced Foundry tests, including invariants
- End-to-end browser tests
- Stronger indexer resilience and reorg handling
- Production deployment workflow and multi-environment setup
