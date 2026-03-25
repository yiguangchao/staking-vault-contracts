export const bootcampTokenAbi = [
    {
        type: 'function',
        stateMutability: 'view',
        name: 'balanceOf',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        stateMutability: 'view',
        name: 'allowance',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        type: 'function',
        stateMutability: 'view',
        name: 'decimals',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        type: 'function',
        stateMutability: 'view',
        name: 'symbol',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
    {
        type: 'function',
        stateMutability: 'nonpayable',
        name: 'approve',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
] as const