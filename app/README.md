# Frontend dApp

This folder contains the Next.js frontend for the staking vault demo.

## What the frontend does

- connects the wallet with RainbowKit
- reads on-chain staking and reward state with wagmi + viem
- sends write transactions for user and admin actions
- shows transaction feedback, network guidance, and dashboard summaries
- queries the local indexer API for user history and summary panels

## Main Features

### User dashboard

- approve staking token allowance
- stake tokens
- withdraw principal
- claim rewards
- view wallet balance, allowance, staked balance, and earned rewards

### Admin dashboard

- set reward rate
- approve reward token allowance
- fund reward pool
- withdraw unused reward pool
- pause / unpause protocol actions

## Local development

Install dependencies:

```bash
pnpm install
```

Start the frontend:

```bash
pnpm dev
```

Default URL:

- `http://localhost:3000`

## Required frontend environment variables

Create a local file from the template:

```bash
cp .env.example .env.local
```

Recommended local values:

```bash
NEXT_PUBLIC_APP_CHAIN=localhost
NEXT_PUBLIC_LOCAL_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_STAKE_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_REWARD_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_VAULT_ADDRESS=0x...
```

Optional variables:

```bash
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
NEXT_PUBLIC_INDEXER_API_URL=http://localhost:4000
```

For Sepolia, switch `NEXT_PUBLIC_APP_CHAIN` to `sepolia` and replace all three contract addresses with the Sepolia deployment addresses. Do not mix local Foundry addresses with Sepolia RPC settings.

## Notes

- If contract addresses are missing, the UI now shows a configuration warning and disables write actions.
- If the wallet is on the wrong network, the dashboard shows a network mismatch banner.
- On the local Foundry chain, rewards only move when new blocks are mined.
- Temporary CI build output under `.next-ci-test/` is ignored by both git and ESLint.
