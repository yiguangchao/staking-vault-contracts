export type SupportedEventName =
    | 'Staked'
    | 'Withdrawn'
    | 'RewardPaid'
    | 'RewardRateUpdated'

export type NormalizedVaultEvent = {
    id: string
    chainId: number
    contractAddress: string
    blockNumber: bigint
    blockHash: string
    transactionHash: string
    logIndex: number
    eventName: SupportedEventName
    userAddress: string | null
    amount: string | null
    newRewardRate: string | null
    rawData: string
}