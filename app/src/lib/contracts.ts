export const STAKE_TOKEN_ADDRESS =
    process.env.NEXT_PUBLIC_STAKE_TOKEN_ADDRESS as `0x${string}`

export const REWARD_TOKEN_ADDRESS =
    process.env.NEXT_PUBLIC_REWARD_TOKEN_ADDRESS as `0x${string}`

export const VAULT_ADDRESS =
    process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}`

if (!STAKE_TOKEN_ADDRESS || !REWARD_TOKEN_ADDRESS || !VAULT_ADDRESS) {
    throw new Error('Missing contract addresses in .env.local')
}