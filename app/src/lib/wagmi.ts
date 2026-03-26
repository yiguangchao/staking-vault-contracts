import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia, localhost } from 'wagmi/chains'

export const wagmiConfig = getDefaultConfig({
    appName: 'Staking Vault',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [sepolia, localhost],
    ssr: true,
    transports: {
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
        [localhost.id]: http('http://127.0.0.1:8545'),
    },
})