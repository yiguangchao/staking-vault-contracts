import { parseAbiItem } from 'viem'

export const STAKED_EVENT = parseAbiItem(
    'event Staked(address indexed user, uint256 amount)'
)

export const WITHDRAWN_EVENT = parseAbiItem(
    'event Withdrawn(address indexed user, uint256 amount)'
)

export const REWARD_PAID_EVENT = parseAbiItem(
    'event RewardPaid(address indexed user, uint256 amount)'
)

export const REWARD_RATE_UPDATED_EVENT = parseAbiItem(
    'event RewardRateUpdated(uint256 newRewardRate)'
)

export const vaultEvents = [
    STAKED_EVENT,
    WITHDRAWN_EVENT,
    REWARD_PAID_EVENT,
    REWARD_RATE_UPDATED_EVENT,
] as const