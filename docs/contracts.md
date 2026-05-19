# Contracts

## BootcampToken
An ERC20 token with:
- AccessControl
- Burnable
- Pausable

## Roles
- DEFAULT_ADMIN_ROLE
- MINTER_ROLE
- PAUSER_ROLE

## StakingVault
A staking contract with:
- stake
- withdraw
- claimRewards
- setRewardRate
- pause / unpause

## Reward Model
This project uses the rewardPerToken accumulation model.

## Security Considerations
- SafeERC20
- ReentrancyGuard
- AccessControl
- Pausable

## Key Design Decisions
- Separate staking token and reward token
- Allow withdraw even when paused
- Clear rewards before transfer
- Update reward state before any critical state transition