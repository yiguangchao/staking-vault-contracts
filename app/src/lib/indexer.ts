import { formatUnits } from "viem";

export const INDEXER_BASE_URL = (
    process.env.NEXT_PUBLIC_INDEXER_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");
const INDEXER_TIMEOUT_MS = 8_000;

export type IndexerEvent = {
    chainId?: number;
    contractAddress?: string;
    blockNumber?: number | string;
    blockHash?: string;
    transactionHash?: string;
    logIndex?: number | string;
    eventName: string;
    userAddress?: string | null;
    amount?: string | number | null;
    newRewardRate?: string | number | null;
    rawData?: unknown;
    createdAt?: string;
    updatedAt?: string;
    timestamp?: string;
};

export type IndexerUserSummary = {
    userAddress?: string;
    totalStakedIn?: string | number | null;
    totalWithdrawn?: string | number | null;
    totalRewardsPaid?: string | number | null;
    netStaked?: string | number | null;
    eventCount?: number | null;
    updatedAt?: string | null;
};

export type RewardRateHistoryItem = {
    blockNumber?: number | string;
    transactionHash?: string;
    logIndex?: number | string;
    newRewardRate?: string | number | null;
    createdAt?: string;
    updatedAt?: string;
    timestamp?: string;
};

export type IndexerHealth = {
    ok?: boolean;
    service?: string;
    eventCount?: number | string | null;
    snapshotCount?: number | string | null;
    defaultLimit?: number | string | null;
    maxLimit?: number | string | null;
    serverTime?: string | null;
};

export type IndexerListOptions = {
    limit?: number;
    offset?: number;
};

function normalizeList<T>(input: unknown): T[] {
    if (Array.isArray(input)) return input as T[];

    if (input && typeof input === "object") {
        const obj = input as Record<string, unknown>;

        if (Array.isArray(obj.data)) return obj.data as T[];
        if (Array.isArray(obj.items)) return obj.items as T[];
        if (Array.isArray(obj.result)) return obj.result as T[];
        if (Array.isArray(obj.events)) return obj.events as T[];
        if (Array.isArray(obj.history)) return obj.history as T[];
    }

    return [];
}

function normalizeOne<T>(input: unknown): T {
    if (input && typeof input === "object") {
        const obj = input as Record<string, unknown>;
        return (obj.data ?? obj.item ?? obj.result ?? input) as T;
    }

    return input as T;
}

function numericLikeToNumber(value: number | string | null | undefined): number {
    if (value == null) return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}

function sortByBlockDesc<T extends { blockNumber?: number | string; logIndex?: number | string }>(
    rows: T[],
): T[] {
    return [...rows].sort((a, b) => {
        const byBlock =
            numericLikeToNumber(b.blockNumber) - numericLikeToNumber(a.blockNumber);
        if (byBlock !== 0) return byBlock;

        return numericLikeToNumber(b.logIndex) - numericLikeToNumber(a.logIndex);
    });
}

async function fetchJson<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INDEXER_TIMEOUT_MS);

    let res: Response;

    try {
        res = await fetch(`${INDEXER_BASE_URL}${path}`, {
            method: "GET",
            cache: "no-store",
            headers: {
                "Content-Type": "application/json",
            },
            signal: controller.signal,
        });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new Error(
                `Indexer request timed out after ${INDEXER_TIMEOUT_MS / 1000} seconds`,
            );
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }

    if (!res.ok) {
        const payload = await res.json().catch(() => null) as
            | { error?: string; message?: string }
            | null;
        const details = payload?.message || payload?.error || res.statusText;
        throw new Error(`Indexer request failed: ${res.status} ${details}`);
    }

    return (await res.json()) as T;
}

function withPagination(path: string, options?: number | IndexerListOptions): string {
    if (options == null) return path;

    const normalized = typeof options === "number" ? { limit: options } : options;
    const params = new URLSearchParams();

    if (normalized.limit && Number.isFinite(normalized.limit) && normalized.limit > 0) {
        params.set("limit", String(Math.trunc(normalized.limit)));
    }

    if (
        normalized.offset != null &&
        Number.isFinite(normalized.offset) &&
        normalized.offset >= 0
    ) {
        params.set("offset", String(Math.trunc(normalized.offset)));
    }

    if (params.size === 0) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}${params.toString()}`;
}

export async function getUserEvents(
    userAddress: string,
    options?: number | IndexerListOptions,
): Promise<IndexerEvent[]> {
    if (!userAddress) return [];
    const data = await fetchJson<unknown>(withPagination(`/events/${userAddress}`, options));
    return sortByBlockDesc(normalizeList<IndexerEvent>(data));
}

export async function getUserSummary(userAddress: string): Promise<IndexerUserSummary> {
    if (!userAddress) {
        return {};
    }

    const data = await fetchJson<unknown>(`/users/${userAddress}/summary`);
    return normalizeOne<IndexerUserSummary>(data);
}

export async function getRewardRateHistory(
    options?: number | IndexerListOptions,
): Promise<RewardRateHistoryItem[]> {
    const data = await fetchJson<unknown>(withPagination(`/reward-rate-history`, options));
    return sortByBlockDesc(normalizeList<RewardRateHistoryItem>(data));
}

export async function getIndexerHealth(): Promise<IndexerHealth> {
    const data = await fetchJson<unknown>("/health");
    return normalizeOne<IndexerHealth>(data);
}

export function toIndexerErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
        return "Failed to load indexer data.";
    }

    if (error.message.includes("timed out")) {
        return "Indexer request timed out. Check whether the local API is running.";
    }

    if (error.message.includes("Invalid user address")) {
        return "The connected address is invalid for indexer queries.";
    }

    if (error.message.includes("Failed to fetch")) {
        return "Could not reach the indexer API. Check the local API URL and server status.";
    }

    return error.message;
}

export function shortHash(value?: string | null, left = 6, right = 4): string {
    if (!value) return "-";
    if (value.length <= left + right) return value;
    return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export function parseBigIntSafe(
    value: string | number | bigint | null | undefined,
): bigint {
    if (value == null) return BigInt(0);

    try {
        return BigInt(value);
    } catch {
        return BigInt(0);
    }
}

export function formatTokenAmount(
    value: string | number | bigint | null | undefined,
    decimals = 18,
    maximumFractionDigits = 4,
): string {
    const raw = parseBigIntSafe(value);
    const formatted = formatUnits(raw, decimals);
    const asNumber = Number(formatted);

    if (Number.isFinite(asNumber)) {
        return new Intl.NumberFormat("en-US", {
            minimumFractionDigits: 0,
            maximumFractionDigits,
        }).format(asNumber);
    }

    return formatted;
}

export function formatDateTime(value?: string | null): string {
    if (!value) return "-";

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    }).format(d);
}
