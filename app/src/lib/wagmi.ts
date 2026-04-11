import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { foundry } from 'viem/chains'

const FALLBACK_WALLETCONNECT_PROJECT_ID = '00000000000000000000000000000000'
const FALLBACK_SEPOLIA_RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com'

const appChain = process.env.NEXT_PUBLIC_APP_CHAIN || 'localhost'
const localRpcUrl = process.env.NEXT_PUBLIC_LOCAL_RPC_URL || 'http://127.0.0.1:8545'
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || FALLBACK_SEPOLIA_RPC_URL
const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || FALLBACK_WALLETCONNECT_PROJECT_ID

const LOCAL_DEV_CHAIN = foundry

export const TARGET_CHAIN = appChain === 'localhost' ? LOCAL_DEV_CHAIN : sepolia
export const TARGET_RPC_URL =
    TARGET_CHAIN.id === LOCAL_DEV_CHAIN.id ? localRpcUrl : sepoliaRpcUrl

export const wagmiConfig = getDefaultConfig({
    appName: 'Staking Vault',
    projectId: walletConnectProjectId,
    chains: [TARGET_CHAIN],
    ssr: true,
    transports: {
        [LOCAL_DEV_CHAIN.id]: http(localRpcUrl),
        [sepolia.id]: http(sepoliaRpcUrl),
    },
})
