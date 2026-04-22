"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatDateTime,
  formatTokenAmount,
  getRewardRateHistory,
  getUserEvents,
  shortHash,
  toIndexerErrorMessage,
  type IndexerEvent,
  type RewardRateHistoryItem,
} from "@/lib/indexer";

type HistoryPanelProps = {
  address?: string;
  stakingTokenDecimals?: number;
  rewardTokenDecimals?: number;
};

function EventBadge({ eventName }: { eventName: string }) {
  const styles: Record<string, string> = {
    Staked: "border-emerald-800 bg-emerald-950/40 text-emerald-300",
    Withdrawn: "border-amber-800 bg-amber-950/40 text-amber-300",
    RewardPaid: "border-sky-800 bg-sky-950/40 text-sky-300",
    RewardRateUpdated: "border-violet-800 bg-violet-950/40 text-violet-300",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[eventName] ?? "border-zinc-700 bg-zinc-900 text-zinc-300"
      }`}
    >
      {eventName}
    </span>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <div className="text-base font-semibold text-white">{title}</div>
      {subtitle ? <div className="mt-1 text-sm text-zinc-400">{subtitle}</div> : null}
    </div>
  );
}

function EventValue({
  event,
  stakingTokenDecimals,
  rewardTokenDecimals,
}: {
  event: IndexerEvent;
  stakingTokenDecimals: number;
  rewardTokenDecimals: number;
}) {
  if (event.eventName === "RewardRateUpdated") {
    return (
      <span className="text-sm text-zinc-200">
        {formatTokenAmount(event.newRewardRate, rewardTokenDecimals)} / sec
      </span>
    );
  }

  const decimals = event.eventName === "RewardPaid" ? rewardTokenDecimals : stakingTokenDecimals;

  return (
    <span className="text-sm text-zinc-200">
      {formatTokenAmount(event.amount, decimals)}
    </span>
  );
}

export function HistoryPanel({
  address,
  stakingTokenDecimals = 18,
  rewardTokenDecimals = 18,
}: HistoryPanelProps) {
  const [events, setEvents] = useState<IndexerEvent[]>([]);
  const [rewardHistory, setRewardHistory] = useState<RewardRateHistoryItem[]>([]);
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
        setEvents([]);
        setRewardHistory([]);
        setError(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const [userEvents, rateHistory] = await Promise.all([
          getUserEvents(address),
          getRewardRateHistory(),
        ]);

        if (!cancelled) {
          setEvents(userEvents);
          setRewardHistory(rateHistory);
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

  const recentEvents = useMemo(() => events.slice(0, 10), [events]);
  const recentRewardHistory = useMemo(() => rewardHistory.slice(0, 10), [rewardHistory]);

  if (!address) {
    return (
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="text-lg font-semibold text-white">History Panel</div>
        <p className="mt-2 text-sm text-zinc-400">连接钱包后显示用户事件与 reward rate 历史。</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">History Panel</div>
          <div className="mt-1 text-sm text-zinc-400">{shortHash(address)}</div>
          <div className="mt-1 text-xs text-zinc-500">
            Indexer-backed history may lag behind the latest block for a short time.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loading ? <div className="text-xs text-zinc-400">Loading...</div> : null}
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

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <SectionTitle
            title="Recent User Events"
            subtitle="Staked / Withdrawn / RewardPaid"
          />

          {recentEvents.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No indexed user events yet. Submit a transaction or refresh after the indexer catches up.
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event, index) => (
                <div
                  key={`${event.transactionHash ?? "tx"}-${event.logIndex ?? index}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <EventBadge eventName={event.eventName} />
                    <EventValue
                      event={event}
                      stakingTokenDecimals={stakingTokenDecimals}
                      rewardTokenDecimals={rewardTokenDecimals}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                    <span>Block: {event.blockNumber ?? "-"}</span>
                    <span>Tx: {shortHash(event.transactionHash)}</span>
                    <span>
                      Time: {formatDateTime(event.createdAt ?? event.timestamp ?? null)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <SectionTitle
            title="Reward Rate History"
            subtitle="RewardRateUpdated 事件历史"
          />

          {recentRewardHistory.length === 0 ? (
            <div className="text-sm text-zinc-500">
              No reward rate updates have been indexed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentRewardHistory.map((item, index) => (
                <div
                  key={`${item.transactionHash ?? "rate"}-${item.logIndex ?? index}`}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <EventBadge eventName="RewardRateUpdated" />
                    <span className="text-sm text-zinc-200">
                      {formatTokenAmount(item.newRewardRate, rewardTokenDecimals)} / sec
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-zinc-500">
                    <span>Block: {item.blockNumber ?? "-"}</span>
                    <span>Tx: {shortHash(item.transactionHash)}</span>
                    <span>
                      Time: {formatDateTime(item.createdAt ?? item.timestamp ?? null)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
