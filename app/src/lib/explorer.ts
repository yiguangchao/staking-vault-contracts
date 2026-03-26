export function getTxExplorerUrl(
    txHash: `0x${string}` | undefined,
    explorerBaseUrl?: string
) {
    if (!txHash || !explorerBaseUrl) return null
    return `${explorerBaseUrl.replace(/\/$/, '')}/tx/${txHash}`
}