import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia, localhost } from 'wagmi/chains'

const appChain = process.env.NEXT_PUBLIC_APP_CHAIN

export const TARGET_CHAIN = appChain === 'localhost' ? localhost : sepolia

export const wagmiConfig = getDefaultConfig({
    appName: 'Staking Vault',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    chains: [TARGET_CHAIN],
    ssr: true,
    transports: {
        [localhost.id]: http(
            process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545'
        ),
        [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
    },
})