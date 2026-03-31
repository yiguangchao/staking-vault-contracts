'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { formatUnits, parseUnits } from 'viem'
import { TARGET_CHAIN } from '@/lib/wagmi'
import { UserSummary } from "@/components/user-summary";
import { HistoryPanel } from "@/components/history-panel";
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
import {
    REWARD_TOKEN_ADDRESS,
    STAKE_TOKEN_ADDRESS,
    VAULT_ADDRESS,
} from '@/lib/contracts'
import { getTxExplorerUrl } from '@/lib/explorer'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
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

    const isWrongNetwork = isConnected && chain?.id !== TARGET_CHAIN.id

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

    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: STAKE_TOKEN_ADDRESS,
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
    })

    const explorerBaseUrl = chain?.blockExplorers?.default?.url
    const txUrl = getTxExplorerUrl(hash, explorerBaseUrl)

    const lastToastHashRef = useRef<string | undefined>(undefined)
    const lastSuccessHashRef = useRef<string | undefined>(undefined)
    const lastErrorRef = useRef<string | undefined>(undefined)

    const needsApproval = (allowance ?? BigInt(0)) < amountWei
    const canShowAdminPanel = Boolean(isAdmin) || Boolean(isPauser)

    async function refreshAll() {
        await Promise.all([
            refetchStakeSymbol(),
            refetchRewardSymbol(),
            refetchStakeDecimals(),
            refetchUserStakeTokenBalance(),
            refetchUserVaultBalance(),
            refetchUserEarned(),
            refetchAllowance(),
            refetchTotalStaked(),
            refetchRewardRate(),
            refetchPaused(),
        ])
    }

    useEffect(() => {
        if (!blockNumber) return
        refreshAll()
    }, [blockNumber])

    useEffect(() => {
        if (!hash) return
        if (lastToastHashRef.current === hash) return

        lastToastHashRef.current = hash
        toast.loading('交易已发出，等待钱包确认与链上打包…', {
            description: shortAddress(hash),
        })
    }, [hash])

    useEffect(() => {
        if (!isConfirmed || !hash) return
        if (lastSuccessHashRef.current === hash) return

        lastSuccessHashRef.current = hash
        toast.success('交易已确认', {
            description: txUrl ? '你可以点下方链接查看区块浏览器' : shortAddress(hash),
        })

        refreshAll()
        setAmount('')
        setNewRewardRate('')
        reset()
    }, [isConfirmed, hash, txUrl, reset])

    useEffect(() => {
        const message = writeError?.message || receiptError?.message
        if (!message) return
        if (lastErrorRef.current === message) return

        lastErrorRef.current = message
        toast.error('交易失败', {
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
            chainId: TARGET_CHAIN.id,
        })
    }

    function handleStake() {
        if (!isConnected || isWrongNetwork || amountWei <= BigInt(0)) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'stake',
            args: [amountWei],
            chainId: TARGET_CHAIN.id,
        })
    }

    function handleWithdraw() {
        if (!isConnected || isWrongNetwork || amountWei <= BigInt(0)) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'withdraw',
            args: [amountWei],
            chainId: TARGET_CHAIN.id,
        })
    }

    function handleClaim() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'claimRewards',
            chainId: TARGET_CHAIN.id,
        })
    }

    function handleSetRewardRate() {
        if (!isConnected || isWrongNetwork || rewardRateWei <= BigInt(0)) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'setRewardRate',
            args: [rewardRateWei],
            chainId: TARGET_CHAIN.id,
        })
    }

    function handlePause() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'pause',
            chainId: TARGET_CHAIN.id,
        })
    }

    function handleUnpause() {
        if (!isConnected || isWrongNetwork) return

        writeContract({
            address: VAULT_ADDRESS,
            abi: stakingVaultAbi,
            functionName: 'unpause',
            chainId: TARGET_CHAIN.id,
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
                                钱包连接、读写合约、管理员面板、交易反馈、自动刷新
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/55">
                                <Badge label={`Network: ${chain?.name ?? 'Not connected'}`} />
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
                                <p className="font-semibold text-amber-200">当前网络不对</p>
                                <p className="mt-1 text-sm text-amber-100/80">
                                    这个 dApp 目前只接 TARGET_CHAIN。请切换到 TARGET_CHAIN 后再进行读写操作。
                                </p>
                            </div>
                            <button
                                onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
                                disabled={isSwitchingChain}
                                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
                            >
                                {isSwitchingChain ? '切换中…' : '切到 TARGET_CHAIN'}
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
                            <InfoRow
                                label="Vault Paused"
                                value={paused ? 'Yes' : 'No'}
                            />
                            <InfoRow
                                label="Connected Address"
                                value={isConnected ? shortAddress(address) : 'Not connected'}
                            />
                        </div>

                        <div className="mt-6">
                            <label className="mb-2 block text-sm text-white/70">
                                Amount ({String(stakeSymbol ?? 'TOKEN')})
                            </label>
                            <input
                                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-base outline-none placeholder:text-white/25"
                                placeholder="100"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                            />
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
                                当前地址不是 admin / pauser，看不到管理员操作。
                            </div>
                        ) : (
                            <>
                                <div className="mt-4 grid gap-3">
                                    <InfoRow label="Admin Role" value={isAdmin ? 'Yes' : 'No'} />
                                    <InfoRow label="Pauser Role" value={isPauser ? 'Yes' : 'No'} />
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

                                <div className="mt-5 space-y-3">
                                    <ActionButton
                                        label="Set Reward Rate"
                                        onClick={handleSetRewardRate}
                                        disabled={
                                            !Boolean(isAdmin) ||
                                            !isConnected ||
                                            isWrongNetwork ||
                                            rewardRateWei <= BigInt(0) ||
                                            isWritePending ||
                                            isConfirming
                                        }
                                        variant="cyan"
                                        fullWidth
                                    />

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
                                    暂停后：
                                    <span className="mx-1 text-white">stake / claimRewards</span>
                                    被禁用，但
                                    <span className="mx-1 text-white">withdraw</span>
                                    仍然保留，方便用户退出仓位。
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
                {isWritePending && <p>请在钱包中确认交易…</p>}
                {isConfirming && <p>交易已发出，等待区块确认…</p>}
                {isConfirmed && <p className="text-emerald-400">交易已确认。</p>}
                {writeError && <p className="break-all text-red-400">写交易失败：{writeError}</p>}
                {receiptError && <p className="break-all text-red-400">上链失败：{receiptError}</p>}

                {!isWritePending &&
                    !isConfirming &&
                    !isConfirmed &&
                    !writeError &&
                    !receiptError && <p>当前没有进行中的交易。</p>}

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
                        在区块浏览器查看交易
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
            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${variantClass} ${fullWidth ? 'w-full' : 'w-full'
                } disabled:cursor-not-allowed disabled:opacity-40`}
        >
            {label}
        </button>
    )
}