export const vaultEventAbi = [
    {
        type: 'event',
        name: 'Staked',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
    },
    {
        type: 'event',
        name: 'Withdrawn',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
    },
    {
        type: 'event',
        name: 'RewardPaid',
        inputs: [
            { indexed: true, name: 'user', type: 'address' },
            { indexed: false, name: 'amount', type: 'uint256' },
        ],
    },
    {
        type: 'event',
        name: 'RewardRateUpdated',
        inputs: [{ indexed: false, name: 'newRewardRate', type: 'uint256' }],
    },
] as const