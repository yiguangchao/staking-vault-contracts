'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatUnits, parseUnits } from 'viem'
import {
    useAccount,
    useBlockNumber,
    useReadContract,
    useSwitchChain,
    useWaitForTransactionReceipt,
    useWriteContract,
} from 'wagmi'
import { toast } from 'sonner'

import { bootcampTokenAbi } from '@/abi/BootcampToken'
import { stakingVaultAbi } from '@/abi/StakingVault'
import { HistoryPanel } from '@/components/history-panel'
import { UserSummary } from '@/components/user-summary'
import {
    REWARD_TOKEN_ADDRESS,
    STAKE_TOKEN_ADDRESS,
    VAULT_ADDRESS,
} from '@/lib/contracts'
import { getTxExplorerUrl } from '@/lib/explorer'
import { TARGET_CHAIN, TARGET_RPC_URL } from '@/lib/wagmi'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1)
const DEFAULT_ADMIN_ROLE =
    '0x0000000000000000000000000000000000000000000000000000000000000000' as const

function safeFormat(value: bigint | undefined, decimals = 18, maximumFractionDigits = 6) {
    if (value === undefined) return '0'
    return Number(formatUnits(value, decimals)).toLocaleString('zh-CN', {
        maximumFractionDigits,
    })
}

function safeParse(value: string, decimals = 18) {
    if (!value || Number(value) <= 0) return BigInt(0)
    return parseUnits(value, decimals)
}

function shortAddress(address?: string) {
    if (!address) return '-'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function StakingDashboard() {
    const { address, isConnected, chain } = useAccount()
    const account = address ?? ZERO_ADDRESS

    const [amount, setAmount] = useState('')
    const [newRewardRate, setNewRewardRate] = useState('')
    const [rewardPoolAmount, setRewardPoolAmount] = useState('')

    const isWrongNetwork = isConnected && chain?.id !== TARGET_CHAIN.id
    const targetNetworkLabel = `${TARGET_CHAIN.name} (${TARGET_CHAIN.id})`
    const currentNetworkLabel = chain ? `${chain.name} (${chain.id})` : 'Not connected'

    const { switchChain, isPending: isSwitchingChain } = useSwitchChain()

    const { data: blockNumber } = useBlockNumber({
        watch: true,
    })

    const { data: stakeSymbol, refetch: refetchStakeSymbol } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'symbol',
    })

    const { data: rewardSymbol, refetch: refetchRewardSymbol } = useReadContract({
        address: REWARD_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'symbol',
    })

    const { data: stakeDecimals, refetch: refetchStakeDecimals } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'decimals',
    })

    const decimals = Number(stakeDecimals ?? 18)

    const amountWei = useMemo(() => {
        try {
            return safeParse(amount, decimals)
        } catch {
            return BigInt(0)
        }
    }, [amount, decimals])

    const rewardRateWei = useMemo(() => {
        try {
            return safeParse(newRewardRate, decimals)
        } catch {
            return BigInt(0)
        }
    }, [newRewardRate, decimals])

    const rewardPoolAmountWei = useMemo(() => {
        try {
            return safeParse(rewardPoolAmount, decimals)
        } catch {
            return BigInt(0)
        }
    }, [rewardPoolAmount, decimals])

    const {
        data: userStakeTokenBalance,
        refetch: refetchUserStakeTokenBalance,
    } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'balanceOf',
        args: [account],
    })

    const {
        data: userVaultBalance,
        refetch: refetchUserVaultBalance,
    } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'balanceOf',
        args: [account],
    })

    const {
        data: userEarned,
        refetch: refetchUserEarned,
    } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'earned',
        args: [account],
    })

    const {
        data: userRewardTokenBalance,
        refetch: refetchUserRewardTokenBalance,
    } = useReadContract({
        address: REWARD_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'balanceOf',
        args: [account],
    })

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'allowance',
        args: [account, VAULT_ADDRESS],
    })

    const {
        data: rewardTokenAllowance,
        refetch: refetchRewardTokenAllowance,
    } = useReadContract({
        address: REWARD_TOKEN_ADDRESS,
        abi: bootcampTokenAbi,
        functionName: 'allowance',
        args: [account, VAULT_ADDRESS],
    })

    const { data: totalStaked, refetch: refetchTotalStaked } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'totalStaked',
    })

    const { data: rewardRate, refetch: refetchRewardRate } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'rewardRate',
    })

    const { data: rewardPoolBalance, refetch: refetchRewardPoolBalance } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'rewardPoolBalance',
    })

    const { data: paused, refetch: refetchPaused } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'paused',
    })

    const { data: pauserRole } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'PAUSER_ROLE',
    })

    const { data: isAdmin } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'hasRole',
        args: [DEFAULT_ADMIN_ROLE, account],
    })

    const { data: isPauser } = useReadContract({
        address: VAULT_ADDRESS,
        abi: stakingVaultAbi,
        functionName: 'hasRole',
        args: [pauserRole ?? DEFAULT_ADMIN_ROLE, account],
    })

    const {
        data: hash,
        writeContract,
        isPending: isWritePending,
        error: writeError,
        reset,
    } = useWriteContract()

    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
        error: receiptError,
    } = useWaitForTransactionReceipt({
        hash,
        chainId: TARGET_CHAIN.id,
    })

    const explorerBaseUrl = chain?.blockExplorers?.default?.url
    const txUrl = getTxExplorerUrl(hash, explorerBaseUrl)

    const lastToastHashRef = useRef<string | undefined>(undefined)
    const lastSuccessHashRef = useRef<string | undefined>(undefined)
    const lastErrorRef = useRef<string | undefined>(undefined)

    const needsApproval = (allowance ?? BigInt(0)) < amountWei
    const canStakeAmount = amountWei <= (userStakeTokenBalance ?? BigInt(0))
    const canWithdrawAmount = amountWei <= (userVaultBalance ?? BigInt(0))
    const canClaimRewards = (userEarned ?? BigInt(0)) > BigInt(0)
    const needsRewardPoolApproval = (rewardTokenAllowance ?? BigInt(0)) < rewardPoolAmountWei
    const canFundRewardPoolAmount = rewardPoolAmountWei <= (userRewardTokenBalance ?? BigInt(0))
    const canWithdrawRewardPoolAmount = rewardPoolAmountWei <= (rewardPoolBalance ?? BigInt(0))
    const canShowAdminPanel = Boolean(isAdmin) || Boolean(isPauser)

    const refreshAll = useCallback(async () => {
        await Promise.all([
            refetchStakeSymbol(),
            refetchRewardSymbol(),
            refetchStakeDecimals(),
            refetchUserStakeTokenBalance(),
            refetchUserVaultBalance(),
            refetchUserEarned(),
            refetchUserRewardTokenBalance(),
            refetchAllowance(),
            refetchRewardTokenAllowance(),
            refetchTotalStaked(),
            refetchRewardRate(),
            refetchRewardPoolBalance(),
            refetchPaused(),
        ])
    }, [
        refetchStakeSymbol,
        refetchRewardSymbol,
        refetchStakeDecimals,
        refetchUserStakeTokenBalance,
        refetchUserVaultBalance,
        refetchUserEarned,
        refetchUserRewardTokenBalance,
        refetchAllowance,
        refetchRewardTokenAllowance,
        refetchTotalStaked,
        refetchRewardRate,
        refetchRewardPoolBalance,
        refetchPaused,
    ])

    useEffect(() => {
        if (!blockNumber) return
        refreshAll()
    }, [blockNumber, refreshAll])

    useEffect(() => {
        if (!hash) return
        if (lastToastHashRef.current === hash) return

        lastToastHashRef.current = hash
        toast.loading('Transaction submitted. Waiting for on-chain confirmation...', {
            description: shortAddress(hash),
        })
    }, [hash])

    useEffect(() => {
        if (!isConfirmed || !hash) return
        if (lastSuccessHashRef.current === hash) return

        lastSuccessHashRef.current = hash
        toast.dismiss()
        toast.success('Transaction confirmed', {
            description: txUrl
                ? 'You can open the block explorer link below.'
                : shortAddress(hash),
        })

        refreshAll()
        setAmount('')
        setNewRewardRate('')
        setRewardPoolAmount('')
        reset()
    }, [isConfirmed, hash, txUrl, reset, refreshAll])

    useEffect(() => {
        const message = writeError?.message || receiptError?.message
        if (!message) return
        if (lastErrorRef.current === message) return

        lastErrorRef.current = message
        toast.dismiss()
        toast.error('Transaction failed', {
            description: message,
        })
    }, [writeError, receiptError])

    function handleApprove() {
        if (!isConnected || isWrongNetwork || amountWei <= BigInt(0)) return

        writeContract({
            address: STAKE_TOKEN_ADDRESS,
            abi: bootcampTokenAbi,
            functionName: 'approve',
            args: [VAULT_ADDRESS, amountWei],
        })
    }

    function handleApproveMax() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: STAKE_TOKEN_ADDRESS,
            abi: bootcampTokenAbi,
            functionName: 'approve',
            args: [VAULT_ADDRESS, MAX_UINT256],
        })
    }

    function handleStake() {
        if (!isConnected || isWrongNetwork || amountWei <= BigInt(0)) return

        if (!canStakeAmount) {
            toast.error('Stake amount exceeds wallet balance', {
                description: `Current wallet balance: ${safeFormat(userStakeTokenBalance as bigint, decimals)} ${String(stakeSymbol ?? 'TOKEN')}`,
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'stake',
            args: [amountWei],
        })
    }

    function handleWithdraw() {
        if (!isConnected || isWrongNetwork || amountWei <= BigInt(0)) return

        if (!canWithdrawAmount) {
            toast.error('Withdraw amount exceeds staked balance', {
                description: `Current staked balance: ${safeFormat(userVaultBalance as bigint, decimals)} ${String(stakeSymbol ?? 'TOKEN')}`,
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'withdraw',
            args: [amountWei],
        })
    }

    function handleClaim() {
        if (!isConnected || isWrongNetwork) return

        if (!canClaimRewards) {
            toast.error('No rewards available to claim', {
                description: 'Wait for more blocks or a higher reward rate before claiming again.',
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'claimRewards',
        })
    }

    function handleSetRewardRate() {
        if (!isConnected || isWrongNetwork || rewardRateWei <= BigInt(0)) return

        if (rewardRateWei === (rewardRate ?? BigInt(0))) {
            toast.error('Reward rate is already set to this value', {
                description: 'Enter a different value before submitting a new admin transaction.',
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'setRewardRate',
            args: [rewardRateWei],
        })
    }

    function handleApproveRewardPool() {
        if (!isConnected || isWrongNetwork || rewardPoolAmountWei <= BigInt(0)) return

        writeContract({
            address: REWARD_TOKEN_ADDRESS,
            abi: bootcampTokenAbi,
            functionName: 'approve',
            args: [VAULT_ADDRESS, rewardPoolAmountWei],
        })
    }

    function handleFundRewardPool() {
        if (!isConnected || isWrongNetwork || rewardPoolAmountWei <= BigInt(0)) return

        if (!canFundRewardPoolAmount) {
            toast.error('Funding amount exceeds reward token wallet balance', {
                description: `Current reward token balance: ${safeFormat(userRewardTokenBalance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`,
            })
            return
        }

        if (needsRewardPoolApproval) {
            toast.error('Approve the reward token first', {
                description: 'The vault needs allowance to transfer reward tokens into the reward pool.',
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'fundRewardPool',
            args: [rewardPoolAmountWei],
        })
    }

    function handleWithdrawRewardPool() {
        if (!isConnected || isWrongNetwork || rewardPoolAmountWei <= BigInt(0)) return

        if (!canWithdrawRewardPoolAmount) {
            toast.error('Withdraw amount exceeds reward pool balance', {
                description: `Current reward pool balance: ${safeFormat(rewardPoolBalance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`,
            })
            return
        }

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'withdrawRewardPool',
            args: [rewardPoolAmountWei, account],
        })
    }

    function handlePause() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'pause',
        })
    }

    function handleUnpause() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'unpause',
        })
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_#020617_55%)] text-white">
            <div className="mx-auto max-w-6xl px-6 py-10">
                <header className="mb-8 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="mb-3 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                                Staking Vault · Day 8.5 / Day 9
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                                Bootcamp Staking dApp
                            </h1>
                            <p className="mt-2 text-sm text-white/65">
                                Wallet connection, contract reads and writes, admin controls,
                                transaction feedback, and live dashboard refresh.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                                <Badge label={`Wallet Network: ${currentNetworkLabel}`} />
                                <Badge label={`Target Network: ${targetNetworkLabel}`} />
                                <Badge label={`Vault: ${shortAddress(VAULT_ADDRESS)}`} />
                                <Badge label={`Stake Token: ${shortAddress(STAKE_TOKEN_ADDRESS)}`} />
                                <Badge label={`Reward Token: ${shortAddress(REWARD_TOKEN_ADDRESS)}`} />
                            </div>
                        </div>

                        <ConnectButton />
                    </div>
                </header>

                {isWrongNetwork && (
                    <section className="mb-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="font-semibold text-amber-200">Network mismatch</p>
                                <p className="mt-1 text-sm text-amber-100/80">
                                    This dApp is configured for {targetNetworkLabel}. Your wallet is currently on{' '}
                                    {currentNetworkLabel}. Switch MetaMask before approving, staking, or claiming.
                                </p>
                                <p className="mt-2 text-xs text-amber-100/70">
                                    MetaMask RPC: {TARGET_RPC_URL || 'Please check NEXT_PUBLIC_SEPOLIA_RPC_URL'}
                                </p>
                            </div>
                            <button
                                onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
                                disabled={isSwitchingChain}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                            >
                                {isSwitchingChain ? 'Switching...' : `Switch to ${TARGET_CHAIN.name}`}
                            </button>
                        </div>
                    </section>
                )}

                <section className="grid gap-4 md:grid-cols-4">
                    <StatCard
                        title="Vault Total Staked"
                        value={safeFormat(totalStaked as bigint, decimals)}
                        suffix={String(stakeSymbol ?? 'TOKEN')}
                    />
                    <StatCard
                        title="Reward Rate / sec"
                        value={safeFormat(rewardRate as bigint, decimals)}
                        suffix={String(rewardSymbol ?? 'RWD')}
                    />
                    <StatCard
                        title="My Staked Balance"
                        value={safeFormat(userVaultBalance as bigint, decimals)}
                        suffix={String(stakeSymbol ?? 'TOKEN')}
                    />
                    <StatCard
                        title="My Earned Rewards"
                        value={safeFormat(userEarned as bigint, decimals)}
                        suffix={String(rewardSymbol ?? 'RWD')}
                    />
                </section>

                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
                    <Badge
                        label={`Reward Pool Balance: ${safeFormat(rewardPoolBalance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`}
                    />
                    <Badge label="Local Foundry rewards only move when new blocks are mined." />
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
                        <h2 className="text-xl font-semibold">User Panel</h2>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <InfoRow
                                label={`Wallet ${String(stakeSymbol ?? 'TOKEN')} Balance`}
                                value={safeFormat(userStakeTokenBalance as bigint, decimals)}
                            />
                            <InfoRow
                                label="Allowance to Vault"
                                value={safeFormat(allowance as bigint, decimals)}
                            />
                            <InfoRow label="Vault Paused" value={paused ? 'Yes' : 'No'} />
                            <InfoRow
                                label="Connected Address"
                                value={isConnected ? shortAddress(address) : 'Not connected'}
                            />
                        </div>

                        <div className="mt-6">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label className="block text-sm text-white/70">
                                    Amount ({String(stakeSymbol ?? 'TOKEN')})
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setAmount(
                                                formatUnits(
                                                    userStakeTokenBalance ?? BigInt(0),
                                                    decimals
                                                )
                                            )
                                        }
                                        disabled={!isConnected || (userStakeTokenBalance ?? BigInt(0)) <= BigInt(0)}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Max
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleApproveMax}
                                        disabled={
                                            !isConnected ||
                                            isWrongNetwork ||
                                            isWritePending ||
                                            isConfirming
                                        }
                                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Approve Max
                                    </button>
                                </div>
                            </div>
                            <input
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base outline-none placeholder:text-white/25"
                                placeholder="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-white/55">
                            {!needsApproval && amountWei > BigInt(0) && (
                                <p>
                                    Allowance already covers this amount. You can stake directly
                                    without approving again.
                                </p>
                            )}
                            {needsApproval && amountWei > BigInt(0) && (
                                <p>
                                    A new approve usually replaces the previous allowance instead
                                    of adding to it, so only approve again when the current
                                    allowance is not enough for this amount.
                                </p>
                            )}
                            <p>
                                Use <span className="text-white">Max</span> to fill in your wallet
                                balance, or <span className="text-white">Approve Max</span> to set
                                a very large allowance for future staking.
                            </p>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            <ActionButton
                                label="Approve"
                                onClick={handleApprove}
                                disabled={
                                    !isConnected ||
                                    isWrongNetwork ||
                                    amountWei <= BigInt(0) ||
                                    !needsApproval ||
                                    isWritePending ||
                                    isConfirming
                                }
                                variant="blue"
                            />

                            <ActionButton
                                label="Stake"
                                onClick={handleStake}
                                disabled={
                                    !isConnected ||
                                    isWrongNetwork ||
                                    amountWei <= BigInt(0) ||
                                    !canStakeAmount ||
                                    needsApproval ||
                                    Boolean(paused) ||
                                    isWritePending ||
                                    isConfirming
                                }
                                variant="emerald"
                            />

                            <ActionButton
                                label="Withdraw"
                                onClick={handleWithdraw}
                                disabled={
                                    !isConnected ||
                                    isWrongNetwork ||
                                    amountWei <= BigInt(0) ||
                                    !canWithdrawAmount ||
                                    isWritePending ||
                                    isConfirming
                                }
                                variant="amber"
                            />

                            <ActionButton
                                label="Claim Rewards"
                                onClick={handleClaim}
                                disabled={
                                    !isConnected ||
                                    isWrongNetwork ||
                                    !canClaimRewards ||
                                    Boolean(paused) ||
                                    isWritePending ||
                                    isConfirming
                                }
                                variant="fuchsia"
                            />
                        </div>

                        <StatusPanel
                            isWritePending={isWritePending}
                            isConfirming={isConfirming}
                            isConfirmed={isConfirmed}
                            writeError={writeError?.message}
                            receiptError={receiptError?.message}
                            txUrl={txUrl}
                            hash={hash}
                        />
                    </section>

                    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur">
                        <h2 className="text-xl font-semibold">Admin Panel</h2>

                        {!canShowAdminPanel ? (
                            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm text-white/60">
                                The connected address does not have admin or pauser permissions.
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-3">
                                    <InfoRow label="Admin Role" value={isAdmin ? 'Yes' : 'No'} />
                                    <InfoRow label="Pauser Role" value={isPauser ? 'Yes' : 'No'} />
                                    <InfoRow
                                        label={`Admin ${String(rewardSymbol ?? 'RWD')} Balance`}
                                        value={`${safeFormat(userRewardTokenBalance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`}
                                    />
                                    <InfoRow
                                        label="Reward Token Allowance to Vault"
                                        value={`${safeFormat(rewardTokenAllowance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`}
                                    />
                                    <InfoRow
                                        label="Reward Pool Balance"
                                        value={`${safeFormat(rewardPoolBalance as bigint, decimals)} ${String(rewardSymbol ?? 'RWD')}`}
                                    />
                                </div>

                                <div className="mt-6">
                                    <label className="mb-2 block text-sm text-white/70">
                                        New Reward Rate / sec ({String(rewardSymbol ?? 'RWD')})
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base outline-none placeholder:text-white/25"
                                        placeholder="1"
                                        value={newRewardRate}
                                        onChange={(e) => setNewRewardRate(e.target.value)}
                                    />
                                </div>

                                <div className="mt-4">
                                    <label className="mb-2 block text-sm text-white/70">
                                        Reward Pool Amount ({String(rewardSymbol ?? 'RWD')})
                                    </label>
                                    <input
                                        className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base outline-none placeholder:text-white/25"
                                        placeholder="500"
                                        value={rewardPoolAmount}
                                        onChange={(e) => setRewardPoolAmount(e.target.value)}
                                    />
                                </div>

                                <div className="mt-5 space-y-3">
                                    <ActionButton
                                        label="Set Reward Rate"
                                        onClick={handleSetRewardRate}
                                        disabled={
                                            !Boolean(isAdmin) ||
                                            !isConnected ||
                                            isWrongNetwork ||
                                            rewardRateWei <= BigInt(0) ||
                                            rewardRateWei === (rewardRate ?? BigInt(0)) ||
                                            isWritePending ||
                                            isConfirming
                                        }
                                        variant="cyan"
                                        fullWidth
                                    />

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <ActionButton
                                            label="Approve Reward Token"
                                            onClick={handleApproveRewardPool}
                                            disabled={
                                                !Boolean(isAdmin) ||
                                                !isConnected ||
                                                isWrongNetwork ||
                                                rewardPoolAmountWei <= BigInt(0) ||
                                                !needsRewardPoolApproval ||
                                                isWritePending ||
                                                isConfirming
                                            }
                                            variant="blue"
                                        />
                                        <ActionButton
                                            label="Fund Reward Pool"
                                            onClick={handleFundRewardPool}
                                            disabled={
                                                !Boolean(isAdmin) ||
                                                !isConnected ||
                                                isWrongNetwork ||
                                                rewardPoolAmountWei <= BigInt(0) ||
                                                !canFundRewardPoolAmount ||
                                                needsRewardPoolApproval ||
                                                isWritePending ||
                                                isConfirming
                                            }
                                            variant="emerald"
                                        />
                                        <ActionButton
                                            label="Withdraw Reward Pool"
                                            onClick={handleWithdrawRewardPool}
                                            disabled={
                                                !Boolean(isAdmin) ||
                                                !isConnected ||
                                                isWrongNetwork ||
                                                rewardPoolAmountWei <= BigInt(0) ||
                                                !canWithdrawRewardPoolAmount ||
                                                isWritePending ||
                                                isConfirming
                                            }
                                            variant="amber"
                                        />
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <ActionButton
                                            label="Pause"
                                            onClick={handlePause}
                                            disabled={
                                                !Boolean(isPauser) ||
                                                !isConnected ||
                                                isWrongNetwork ||
                                                Boolean(paused) ||
                                                isWritePending ||
                                                isConfirming
                                            }
                                            variant="rose"
                                        />
                                        <ActionButton
                                            label="Unpause"
                                            onClick={handleUnpause}
                                            disabled={
                                                !Boolean(isPauser) ||
                                                !isConnected ||
                                                isWrongNetwork ||
                                                !Boolean(paused) ||
                                                isWritePending ||
                                                isConfirming
                                            }
                                            variant="violet"
                                        />
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white/65">
                                    Admin funding first approves the reward token, then moves it into
                                    the vault reward pool. Reward-pool withdrawals send tokens back to
                                    the connected admin wallet.
                                </div>

                                <div className="mt-3 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm text-white/65">
                                    When paused, <span className="mx-1 text-white">stake</span> and{' '}
                                    <span className="mx-1 text-white">claimRewards</span> are blocked,
                                    while <span className="mx-1 text-white">withdraw</span> stays
                                    available so users can still exit their position.
                                </div>
                            </>
                        )}
                    </section>
                </div>

                {isConnected && address ? (
                    <section className="mt-8">
                        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                            <div className="xl:col-span-1">
                                <UserSummary
                                    address={address}
                                    stakingTokenDecimals={18}
                                    rewardTokenDecimals={18}
                                />
                            </div>

                            <div className="xl:col-span-2">
                                <HistoryPanel
                                    address={address}
                                    stakingTokenDecimals={18}
                                    rewardTokenDecimals={18}
                                />
                            </div>
                        </div>
                    </section>
                ) : null}
            </div>
        </main>
    )
}

function StatusPanel({
    isWritePending,
    isConfirming,
    isConfirmed,
    writeError,
    receiptError,
    txUrl,
    hash,
}: {
    isWritePending: boolean
    isConfirming: boolean
    isConfirmed: boolean
    writeError?: string
    receiptError?: string
    txUrl: string | null
    hash?: `0x${string}`
}) {
    return (
        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/50 p-4 text-sm">
            <p className="mb-3 font-medium text-white/80">Transaction Status</p>

            <div className="space-y-2 text-white/65">
                {isWritePending && <p>Please confirm the transaction in your wallet.</p>}
                {isConfirming && <p>Transaction sent. Waiting for block confirmation...</p>}
                {isConfirmed && <p className="text-emerald-400">Transaction confirmed.</p>}
                {writeError && <p className="break-all text-red-400">Write failed: {writeError}</p>}
                {receiptError && <p className="break-all text-red-400">On-chain failure: {receiptError}</p>}

                {!isWritePending &&
                    !isConfirming &&
                    !isConfirmed &&
                    !writeError &&
                    !receiptError && <p>No transaction is currently in progress.</p>}

                {hash && (
                    <p className="break-all text-white/45">
                        Tx Hash: {hash}
                    </p>
                )}

                {txUrl && (
                    <a
                        href={txUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-cyan-300 underline underline-offset-4"
                    >
                        View transaction in block explorer
                    </a>
                )}
            </div>
        </div>
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
        <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 shadow-lg backdrop-blur">
            <p className="text-sm text-white/55">{title}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
                {value} {suffix ?? ''}
            </p>
        </div>
    )
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
            <p className="text-xs text-white/45">{label}</p>
            <p className="mt-2 text-sm font-medium text-white/90">{value}</p>
        </div>
    )
}

function Badge({ label }: { label: string }) {
    return (
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {label}
        </span>
    )
}

function ActionButton({
    label,
    onClick,
    disabled,
    variant,
    fullWidth,
}: {
    label: string
    onClick: () => void
    disabled?: boolean
    variant: 'blue' | 'emerald' | 'amber' | 'fuchsia' | 'cyan' | 'rose' | 'violet'
    fullWidth?: boolean
}) {
    const variantClass = {
        blue: 'bg-blue-600 hover:bg-blue-500',
        emerald: 'bg-emerald-600 hover:bg-emerald-500',
        amber: 'bg-amber-500 text-slate-950 hover:bg-amber-400',
        fuchsia: 'bg-fuchsia-600 hover:bg-fuchsia-500',
        cyan: 'bg-cyan-500 text-slate-950 hover:bg-cyan-400',
        rose: 'bg-rose-600 hover:bg-rose-500',
        violet: 'bg-violet-600 hover:bg-violet-500',
    }[variant]

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${variantClass} ${fullWidth ? 'w-full' : 'w-full'} disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {label}
        </button>
    )
}

