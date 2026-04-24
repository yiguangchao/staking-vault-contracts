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
- Approve reward tokens to the vault for pool funding
- Fund the reward pool through the vault admin flow
- Withdraw unused reward-pool funds back to the admin wallet
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
ERC20 token implementation used for both the staking-token deployment and the reward-token deployment in the local demo setup.

### `StakingVault.sol`
Core vault logic:
- `stake(uint256 amount)`
- `withdraw(uint256 amount)`
- `claimRewards()`
- `setRewardRate(uint256 newRewardRate)`
- `fundRewardPool(uint256 amount)`
- `withdrawRewardPool(uint256 amount, address to)`
- `pause()` / `unpause()`

Security modules used:
- `AccessControl`
- `Pausable`
- `ReentrancyGuard`
- `SafeERC20`

Constructor hardening:
- rejects zero addresses
- rejects using the same token address as both the staking and reward asset

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

## Reward Pool Management

The reward pool is now managed explicitly through the vault instead of relying only on manual token transfers.

Admin reward-pool flow:
1. Hold reward tokens in the admin wallet
2. Approve the vault to spend the reward token
3. Call `fundRewardPool(amount)` from the admin account
4. The vault records the funded balance and uses it for future reward payouts

Admin withdrawal flow:
1. Enter a reward-pool amount in the admin panel
2. Call `withdrawRewardPool(amount, to)`
3. The vault transfers unused reward tokens back to the chosen recipient

Why this matters:
- The protocol now has a formal funding path instead of an implicit “send tokens to the contract” step
- Frontend validation can check admin reward-token balance and allowance before sending transactions
- The reward-pool lifecycle is easier to explain, test, and operate

## Test Coverage

The repository now validates behavior at multiple levels:

- unit tests for staking, withdrawals, claims, reward rate changes, admin permissions, and reward pool management
- negative-path tests for paused actions, unauthorized access, zero amounts, and insufficient balances
- stateful invariant tests that mix user actions and admin actions over time

Examples of explicit edge cases covered by unit tests:

- zero-amount staking, withdrawal, and reward-pool operations
- claiming rewards when nothing is claimable
- withdrawing reward-pool funds to the zero address
- event emission coverage for staking, withdrawals, claims, reward-rate updates, and reward-pool admin actions

Current invariant coverage checks:

- `totalStaked` must equal the sum of all tracked user staking balances
- the vault stake-token balance must always cover `totalStaked`
- tracked reward-token balances must stay conserved across admin, users, and vault

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
- Validates user-address input and caps API list sizes for safer local and testnet usage
- Frontend indexer panels support manual refresh and clearer timeout / retry messaging
- Frontend indexer panels now read bounded result sets and surface indexer health information

## CI Coverage

GitHub Actions currently runs:

- `forge build`
- `forge test -vv`
- `forge test --match-path test/StakingVault.invariant.t.sol -vv`
- frontend `pnpm lint`
- frontend `pnpm build`

This keeps protocol changes and frontend integration changes validated together on every push and pull request.

## Troubleshooting

### Frontend shows wallet connection but write actions stay disabled

Check these first:

- `NEXT_PUBLIC_STAKE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_REWARD_TOKEN_ADDRESS`
- `NEXT_PUBLIC_VAULT_ADDRESS`
- wallet network matches the configured target chain

If any contract address is missing, the dashboard now shows a configuration warning and contract write buttons stay disabled on purpose.

### Frontend lint unexpectedly scans generated files

The frontend ESLint config now ignores `.next-ci-test/**` in addition to the standard `.next/**` output.

If lint output still looks noisy, remove temporary build folders and rerun:

```bash
cd app
pnpm lint
```

### Indexer requests fail or hang

The frontend now times out indexer requests after a short window and surfaces the failure message in the UI.

If history panels are failing:

- confirm the indexer API is running on `http://localhost:4000`
- check `NEXT_PUBLIC_INDEXER_API_URL` if you changed the API host
- verify the requested wallet address is valid hex and the API is not returning `400`

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

Use the deployment script in `script/Deploy.s.sol` to deploy local contracts if needed. The script now:
- deploys the stake token
- deploys the reward token
- deploys the vault
- approves the vault for reward-pool funding
- funds the reward pool via `fundRewardPool`
- sets the initial `rewardRate`

Local broadcast example:
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

### 3.1 Deploy to Sepolia

Required root `.env` values:
```bash
PRIVATE_KEY=0x...
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
ETHERSCAN_API_KEY=your_etherscan_key
```

Sepolia deployment command:
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast
```

If you want Foundry to verify during broadcast:
```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 3.2 Verify Contracts on Etherscan

If you prefer separate verification after deployment, use the deployed constructor arguments and run `forge verify-contract`.

Typical pattern:
```bash
forge verify-contract \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  <DEPLOYED_CONTRACT_ADDRESS> \
  src/StakingVault.sol:StakingVault
```

Do the same for:
- `src/BootcampToken.sol:BootcampToken` for the staking token
- `src/BootcampToken.sol:BootcampToken` for the reward token
- `src/StakingVault.sol:StakingVault` for the vault

Note:
- Verification requires the real deployed addresses from Sepolia
- I can prepare the workflow and commands locally, but the actual deploy/verify step still needs your real private key, RPC, and Etherscan API key

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
pnpm lint
```

Useful higher-signal contract checks added in this project:
- reward-pool funding and withdrawal permissions
- reward-pool insufficiency revert path
- paused claim revert path
- reward-rate changes preserving already accrued rewards
- post-claim future accrual continuing correctly

## Local Verification

The full local user flow has been verified successfully on the Foundry local network (`chainId 31337`).

Verified user flow:
- Approve staking token allowance to the vault
- Stake `100 BCT`
- Accrue rewards over subsequent local blocks
- Claim rewards successfully
- Withdraw staked principal successfully

Verified admin flow:
- Pause the vault
- Unpause the vault

Observed expected behavior:
- `approve` increased allowance without changing staked balance
- `stake` reduced wallet `BCT` balance and increased `My Staked Balance`
- `claimRewards` reduced the vault reward pool and transferred rewards to the user
- `withdraw` returned principal to the wallet and reduced the staked balance
- `pause` disabled restricted actions, and `unpause` restored normal behavior

Local environment used:
- Frontend: `http://localhost:3000`
- RPC: `http://127.0.0.1:8545`
- Network: Foundry / Anvil
- Chain ID: `31337`

## CI

GitHub Actions now runs:
- `forge build`
- `forge test -vv`
- frontend dependency install
- frontend lint

Workflow file:
- [`.github/workflows/test.yml`](./.github/workflows/test.yml)

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
 
- Reward campaign scheduling and richer admin controls
- More complete frontend validation and UX polish
- Full cleanup of historical UI copy and localization
- More advanced Foundry tests, including invariants and fork-based checks
- End-to-end browser tests
- Stronger indexer resilience and reorg handling
- Production deployment workflow and multi-environment setup 
## Latest Engineering Update

This repository now includes stronger verification and release-readiness work:

- stateful invariant tests for `StakingVault`
- CI checks for `forge build`, `forge test`, frontend `lint`, and frontend `build`
- deployment flow aligned with reward pool funding
- local Foundry user/admin flow verification recorded in this README
