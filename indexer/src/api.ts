import express, { type Response } from "express";
import cors from "cors";
import { prisma } from "./db";

const app = express();
const PORT = 4000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

function serializeBigInts<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  ) as T;
}

function sendJson(res: Response, data: unknown, status = 200) {
  return res.status(status).json(serializeBigInts(data));
}

function normalizeLimit(raw: unknown, fallback = DEFAULT_LIMIT) {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
}

function normalizeAddress(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return raw[0]?.trim().toLowerCase() ?? "";
  }

  return raw?.trim().toLowerCase() ?? "";
}

function isHexAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function asyncRoute<
  TReq extends express.Request = express.Request,
  TRes extends express.Response = express.Response,
>(handler: (req: TReq, res: TRes) => Promise<unknown>) {
  return async (req: TReq, res: TRes, next: express.NextFunction) => {
    try {
      await handler(req, res);
    } catch (error) {
      next(error);
    }
  };
}

app.get("/health", asyncRoute(async (_req, res) => {
  const [eventCount, snapshotCount] = await Promise.all([
    prisma.vaultEvent.count(),
    prisma.userPositionSnapshot.count(),
  ]);

  return sendJson(res, {
    ok: true,
    service: "staking-vault-indexer",
    eventCount,
    snapshotCount,
  });
}));

app.get("/events", asyncRoute(async (req, res) => {
  const limit = normalizeLimit(req.query.limit);

  const events = await prisma.vaultEvent.findMany({
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: limit,
  });

  return sendJson(res, events);
}));

app.get("/events/:userAddress", asyncRoute(async (req, res) => {
  const userAddress = normalizeAddress(req.params.userAddress);
  const limit = normalizeLimit(req.query.limit, 50);

  if (!isHexAddress(userAddress)) {
    return sendJson(res, { error: "Invalid user address" }, 400);
  }

  const events = await prisma.vaultEvent.findMany({
    where: { userAddress },
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: limit,
  });

  return sendJson(res, events);
}));

app.get("/users/:userAddress/summary", asyncRoute(async (req, res) => {
  const userAddress = normalizeAddress(req.params.userAddress);

  if (!isHexAddress(userAddress)) {
    return sendJson(res, { error: "Invalid user address" }, 400);
  }

  const summary = await prisma.userPositionSnapshot.findUnique({
    where: {
      userAddress,
    },
  });

  if (!summary) {
    return sendJson(res, {
      userAddress,
      totalStakedIn: "0",
      totalWithdrawn: "0",
      totalRewardsPaid: "0",
      netStaked: "0",
      eventCount: 0,
      updatedAt: null,
    });
  }

  const totalStakedIn = BigInt(summary.totalStakedIn ?? 0);
  const totalWithdrawn = BigInt(summary.totalWithdrawn ?? 0);
  const totalRewardsPaid = BigInt(summary.totalRewardsPaid ?? 0);
  const netStaked = totalStakedIn - totalWithdrawn;

  return sendJson(res, {
    ...summary,
    netStaked,
  });
}));

app.get("/reward-rate-history", asyncRoute(async (req, res) => {
  const limit = normalizeLimit(req.query.limit, 50);

  const history = await prisma.vaultEvent.findMany({
    where: {
      eventName: "RewardRateUpdated",
    },
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: limit,
  });

  return sendJson(res, history);
}));

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unknown indexer error";
  console.error("Indexer API error:", message);

  return sendJson(
    res,
    {
      error: "Internal server error",
      message,
    },
    500
  );
});

app.listen(PORT, () => {
  console.log(`Indexer API listening on :${PORT}`);
});
