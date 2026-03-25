import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia } from 'wagmi/chains'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

if (!projectId) {
    throw new Error('Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID')
}

export const wagmiConfig = getDefaultConfig({
    appName: 'Staking Vault',
    projectId,
    chains: [sepolia],
    ssr: true,
    transports: {
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    },
})