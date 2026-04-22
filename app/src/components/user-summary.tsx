"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    formatDateTime,
    formatTokenAmount,
    getUserSummary,
    parseBigIntSafe,
    shortHash,
    toIndexerErrorMessage,
    type IndexerUserSummary,
} from "@/lib/indexer";

type UserSummaryProps = {
    address?: string;
    stakingTokenDecimals?: number;
    rewardTokenDecimals?: number;
};

function SummaryCard({
    label,
    value,
    subtext,
}: {
    label: string;
    value: string;
    subtext?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
            <div className="mt-2 text-xl font-semibold text-white">{value}</div>
            {subtext ? <div className="mt-1 text-xs text-zinc-500">{subtext}</div> : null}
        </div>
    );
}

export function UserSummary({
    address,
    stakingTokenDecimals = 18,
    rewardTokenDecimals = 18,
}: UserSummaryProps) {
    const [summary, setSummary] = useState<IndexerUserSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [refreshNonce, setRefreshNonce] = useState(0);

    const refresh = useCallback(() => {
        setRefreshNonce((value) => value + 1);
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            if (!address) {
                setSummary(null);
                setError(null);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const data = await getUserSummary(address);
                if (!cancelled) {
                    setSummary(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(toIndexerErrorMessage(err));
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [address, refreshNonce]);

    const totalStakedIn = useMemo(
        () => parseBigIntSafe(summary?.totalStakedIn),
        [summary?.totalStakedIn],
    );
    const totalWithdrawn = useMemo(
        () => parseBigIntSafe(summary?.totalWithdrawn),
        [summary?.totalWithdrawn],
    );
    const totalRewardsPaid = useMemo(
        () => parseBigIntSafe(summary?.totalRewardsPaid),
        [summary?.totalRewardsPaid],
    );
    const netStaked = useMemo(() => {
        if (summary?.netStaked != null) {
            return parseBigIntSafe(summary.netStaked);
        }
        return totalStakedIn - totalWithdrawn;
    }, [summary?.netStaked, totalStakedIn, totalWithdrawn]);

    if (!address) {
        return (
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
                <div className="text-lg font-semibold text-white">User Summary</div>
                <p className="mt-2 text-sm text-zinc-400">连接钱包后显示你的链下汇总数据。</p>
            </section>
        );
    }

    return (
        <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-lg font-semibold text-white">User Summary</div>
                    <div className="mt-1 text-sm text-zinc-400">{shortHash(address)}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                        This panel is built from indexed events and may update slightly after on-chain reads.
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {loading ? (
                        <div className="text-xs text-zinc-400">Loading...</div>
                    ) : null}
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {error ? (
                <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/30 p-3 text-sm text-red-300">
                    <div>{error}</div>
                    <button
                        type="button"
                        onClick={refresh}
                        disabled={loading}
                        className="mt-3 rounded-xl border border-red-800/60 bg-red-950/40 px-3 py-1 text-xs text-red-200 transition hover:bg-red-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Retry
                    </button>
                </div>
            ) : null}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SummaryCard
                    label="Total Staked In"
                    value={formatTokenAmount(totalStakedIn, stakingTokenDecimals)}
                    subtext="累计质押进入 Vault 的数量"
                />
                <SummaryCard
                    label="Total Withdrawn"
                    value={formatTokenAmount(totalWithdrawn, stakingTokenDecimals)}
                    subtext="累计从 Vault 提取的数量"
                />
                <SummaryCard
                    label="Net Staked"
                    value={formatTokenAmount(netStaked, stakingTokenDecimals)}
                    subtext="当前净质押估算"
                />
                <SummaryCard
                    label="Rewards Paid"
                    value={formatTokenAmount(totalRewardsPaid, rewardTokenDecimals)}
                    subtext="累计已领取奖励"
                />
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
                <span>Events: {summary?.eventCount ?? "-"}</span>
                <span>Updated: {formatDateTime(summary?.updatedAt ?? null)}</span>
            </div>
        </section>
    );
}
