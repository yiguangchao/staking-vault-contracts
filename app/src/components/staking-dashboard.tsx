'use client'

import { useMemo, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
} from 'wagmi'

import { bootcampTokenAbi } from '@/abi/BootcampToken'
import { stakingVaultAbi } from '@/abi/StakingVault'
import {
    STAKE_TOKEN_ADDRESS,
    REWARD_TOKEN_ADDRESS,
    VAULT_ADDRESS,
} from '@/lib/contracts'
import { formatToken, toTokenUnits } from '@/lib/utils'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function StakingDashboard() {
    const { address, isConnected, chain } = useAccount()
    const [amount, setAmount] = useState('')

    const account = address ?? ZERO_ADDRESS

    const { data: stakeSymbol } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'symbol',
    })

    const { data: rewardSymbol } = useReadContract({
        address: REWARD_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'symbol',
    })

    const { data: stakeDecimals } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'decimals',
    })

    const decimals = Number(stakeDecimals ?? 18)

    const amountWei = useMemo(() => {
        try {
            return toTokenUnits(amount, decimals)
        } catch {
            return 0n
        }
    }, [amount, decimals])

    const { data: userStakeTokenBalance } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'balanceOf',
        args: [account],
    })

    const { data: userVaultBalance } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'balanceOf',
        args: [account],
    })

    const { data: userEarned } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'earned',
        args: [account],
    })

    const { data: allowance } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'allowance',
        args: [account, VAULT_ADDRESS],
    })

    const { data: totalStaked } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'totalStaked',
    })

    const { data: rewardRate } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'rewardRate',
    })

    const { data: paused } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'paused',
    })

    const {
        data: hash,
        writeContract,
        isPending: isWritePending,
        error: writeError,
    } = useWriteContract()

    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        error: receiptError,
    } = useWaitForTransactionReceipt({
        hash,
    })

    const needsApproval = (allowance ?? 0n) < amountWei

    function handleApprove() {
        if (!isConnected || amountWei <= 0n) return

        writeContract({
            address: STAKE_TOKEN_ADDRESS,
            abi: bootcampTokenAbi,
            functionName: 'approve',
            args: [VAULT_ADDRESS, amountWei],
        })
    }

    function handleStake() {
        if (!isConnected || amountWei <= 0n) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'stake',
            args: [amountWei],
        })
    }

    function handleWithdraw() {
        if (!isConnected || amountWei <= 0n) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'withdraw',
            args: [amountWei],
        })
    }

    function handleClaim() {
        if (!isConnected) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'claimRewards',
        })
    }

    return (
        <main className="min-h-screen bg-slate-950 text-white">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Staking Vault</h1>
                        <p className="mt-2 text-sm text-white/70">
                            Bootcamp Token staking dApp
                        </p>
                        <p className="mt-1 text-sm text-white/50">
                            Network: {chain?.name ?? 'Not connected'}
                        </p>
                    </div>
                    <ConnectButton />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard title="Vault Total Staked" value={formatToken(totalStaked as bigint, decimals)} suffix={String(stakeSymbol ?? 'TOKEN')} />
                    <StatCard title="Reward Rate / sec" value={formatToken(rewardRate as bigint, decimals)} suffix={String(rewardSymbol ?? 'RWD')} />
                    <StatCard title="Vault Paused" value={paused ? 'Yes' : 'No'} />
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-xl font-semibold">My Position</h2>
                        <div className="mt-4 space-y-3 text-sm text-white/80">
                            <Row label={`Wallet ${String(stakeSymbol ?? 'TOKEN')} Balance`} value={formatToken(userStakeTokenBalance as bigint, decimals)} />
                            <Row label="My Staked Balance" value={formatToken(userVaultBalance as bigint, decimals)} />
                            <Row label="My Earned Rewards" value={`${formatToken(userEarned as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`} />
                            <Row label="Allowance to Vault" value={formatToken(allowance as bigint, decimals)} />
                        </div>
                    </section>

                    <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-xl font-semibold">Actions</h2>

                        <div className="mt-4">
                            <label className="mb-2 block text-sm text-white/70">
                                Amount ({String(stakeSymbol ?? 'TOKEN')})
                            </label>
                            <input
                                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none placeholder:text-white/30"
                                placeholder="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">
                            <button
                                onClick={handleApprove}
                                disabled={!isConnected || amountWei <= 0n || !needsApproval || isWritePending || isConfirming}
                                className="rounded-xl bg-blue-600 px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Approve
                            </button>

                            <button
                                onClick={handleStake}
                                disabled={!isConnected || amountWei <= 0n || needsApproval || Boolean(paused) || isWritePending || isConfirming}
                                className="rounded-xl bg-emerald-600 px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Stake
                            </button>

                            <button
                                onClick={handleWithdraw}
                                disabled={!isConnected || amountWei <= 0n || isWritePending || isConfirming}
                                className="rounded-xl bg-amber-600 px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Withdraw
                            </button>

                            <button
                                onClick={handleClaim}
                                disabled={!isConnected || Boolean(paused) || isWritePending || isConfirming}
                                className="rounded-xl bg-fuchsia-600 px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Claim Rewards
                            </button>
                        </div>

                        <div className="mt-4 min-h-10 text-sm text-white/70">
                            {isWritePending && <p>请在钱包中确认交易…</p>}
                            {isConfirming && <p>交易已发出，等待区块确认…</p>}
                            {isConfirmed && <p className="text-emerald-400">交易已确认。</p>}
                            {writeError && <p className="text-red-400">写交易失败：{writeError.message}</p>}
                            {receiptError && <p className="text-red-400">上链失败：{receiptError.message}</p>}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    )
}

function StatCard({
    title,
    value,
    suffix,
}: {
    title: string
    value: string
    suffix?: string
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm text-white/60">{title}</p>
            <p className="mt-3 text-2xl font-semibold">
                {value} {suffix ?? ''}
            </p>
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
            <span className="text-white/60">{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    )
}