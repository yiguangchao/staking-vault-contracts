A full-stack Web3 staking demo built with Solidity, Foundry, Next.js, wagmi, viem, and a lightweight Node.js indexer. The project covers the complete user flow from token approval to staking, reward accrual, reward claiming, and admin controls.

## What this project includes

- A staking vault contract with configurable reward rate and pause controls
- ERC20 staking and reward tokens for local and testnet workflows
- A Next.js frontend for wallet connection, staking flows, admin controls, and live contract reads
- A Node.js indexer and API for event history and user summary data
- Foundry unit tests, invariant tests, deployment scripts, and CI automation

## Repository layout

- `src/`
  - Solidity contracts
- `test/`
  - Foundry unit and invariant tests
- `script/`
  - Deployment scripts
- `app/`
  - Next.js dApp frontend
- `indexer/`
  - Event indexer, API, and Prisma schema
- `docs/`
  - Project diagrams and supporting docs

## Core contracts

### `BootcampToken.sol`
- ERC20 token used for staking and rewards
- Mintable and pausable

### `StakingVault.sol`
- Users can:
  - `stake(amount)`
  - `withdraw(amount)`
  - `claimRewards()`
- Admins can:
  - `setRewardRate(newRewardRate)`
  - `pause()`
  - `unpause()`
  - `fundRewardPool(amount)`
  - `withdrawRewardPool(amount, to)`
- Uses:
  - `AccessControl`
  - `Pausable`
  - `ReentrancyGuard`

## Reward pool management

The vault now exposes explicit reward-pool management functions instead of relying on manual token transfers:

- `fundRewardPool(amount)`
  - Admin approves reward tokens, then funds the vault through a contract call
- `withdrawRewardPool(amount, to)`
  - Admin withdraws unused reward tokens from the vault
- `rewardPoolBalance()`
  - Reads the current reward-token balance held by the vault

This makes reward funding easier to reason about, easier to test, and closer to a production-friendly admin workflow.

## Frontend features

### User dashboard
- Wallet connection
- Network status and contract address display
- Wallet token balance
- Allowance display
- Approve / Approve Max
- Stake / Withdraw / Claim Rewards
- Local validation for:
  - insufficient wallet balance
  - insufficient staked balance
  - zero rewards
  - redundant approvals
- Transaction feedback and loading/success/error states

### Admin dashboard
- Admin and pauser role display
- Reward rate update controls
- Pause / Unpause controls
- Reward pool amount input
- Approve reward token
- Fund reward pool
- Withdraw reward pool
- Reward pool balance display

## Indexer and API

The indexer listens for on-chain events and stores them in Prisma-backed tables.

### Indexer
- Listens to `Staked`, `Withdrawn`, `RewardPaid`, and `RewardRateUpdated`
- Persists indexed data with Prisma
- Serves API routes for event history and user summaries
- Validates user-address input and caps API list sizes for safer local and testnet usage
- Frontend indexer panels support manual refresh and clearer timeout / retry messaging
- Frontend indexer panels now read bounded result sets and surface indexer health information
- Frontend indexer panels also show the most recent successful refresh time for easier debugging during local development

## CI Coverage

GitHub Actions currently runs:

- `forge build`
- `forge test -vv`
- invariant tests for `StakingVault`
- frontend `pnpm lint`
- frontend `pnpm build`

## Test coverage

### Contract unit tests
Current unit tests cover:

- staking
- withdrawing
- claiming rewards
- reward accrual after time passes
- reward distribution between multiple stakers
- reward rate updates
- pause / unpause behavior
- reward pool funding and withdrawal
- zero-value and zero-address edge cases
- event emission coverage for key flows

### Invariant tests
Stateful invariants cover:

- `totalStaked == sum(balanceOf[user])`
- vault staking-token balance must always cover `totalStaked`
- tracked reward-token balances remain conserved under handler actions

## Local verification

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

## Local setup

### 1. Install dependencies

Root:
```bash
pnpm install
```

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

### 2. Start Anvil
```bash
anvil
```

### 3. Deploy contracts locally
```bash
forge script script/Deploy.s.sol:DeployScript --rpc-url http://127.0.0.1:8545 --broadcast
```

### 4. Start the frontend
```bash
cd app
pnpm dev
```

### 5. Start the indexer API
```bash
cd indexer
pnpm dev:api
```

### 6. Start the indexer listener
```bash
cd indexer
pnpm dev:listener
```

## Environment variables

### Root `.env`
- `PRIVATE_KEY`
- `SEPOLIA_RPC_URL`
- `ETHERSCAN_API_KEY`

### `app/.env.local`
- `NEXT_PUBLIC_APP_CHAIN`
- `NEXT_PUBLIC_LOCAL_RPC_URL`
- `NEXT_PUBLIC_SEPOLIA_RPC_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_STAKE_TOKEN_ADDRESS`
- `NEXT_PUBLIC_REWARD_TOKEN_ADDRESS`
- `NEXT_PUBLIC_VAULT_ADDRESS`
- `NEXT_PUBLIC_INDEXER_API_URL`

### `indexer/.env`
- `DATABASE_URL`
- `RPC_URL`
- `CHAIN_ID`
- `VAULT_ADDRESS`

## Troubleshooting

### Frontend build / lint
- If local Windows builds fail with `.next` file locking, stop the dev server and remove `app/.next`
- The frontend ignores `app/.next-ci-test/` in both ESLint and gitignore so temporary CI build outputs do not pollute local lint runs

### Indexer
- confirm the indexer API is running on `http://localhost:4000`
- confirm `NEXT_PUBLIC_INDEXER_API_URL` matches the API endpoint
- indexed panels may lag behind the latest chain state briefly
- the frontend now times out indexer requests after a short window and surfaces the failure message in the UI

### Sepolia deployment
- ensure `SEPOLIA_RPC_URL` is a real Sepolia endpoint, not mainnet
- ensure the deployment wallet has sufficient Sepolia ETH for gas
- ensure `ETHERSCAN_API_KEY` is valid before contract verification

## Documentation assets

Project diagrams live in `docs/`:
- `staking-flow-overview.svg`
- `admin-flow-overview.svg`
- `system-architecture-overview.svg`
- `page-button-guide.svg`

## Future improvements

- Sepolia deployment and verified public testnet addresses
- Stronger indexer resilience and reorg handling
- More production-like governance such as multisig and timelock
- E2E tests for frontend flows
- APY / APR display and richer dashboard analytics
