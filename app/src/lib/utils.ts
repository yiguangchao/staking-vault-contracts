import { formatUnits, parseUnits } from 'viem'

export function formatToken(value: bigint | undefined, decimals = 18) {
    if (value === undefined) return '0'
    return Number(formatUnits(value, decimals)).toLocaleString('zh-CN', {
        maximumFractionDigits: 6,
    })
}

export function toTokenUnits(value: string, decimals = 18) {
    if (!value || Number(value) <= 0) return 0n
    return parseUnits(value, decimals)
}