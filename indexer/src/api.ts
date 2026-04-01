import express, { type Response } from "express";
import cors from "cors";
import { prisma } from "./db";

const app = express();
const PORT = 4000;

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

app.get("/health", async (_req, res) => {
  return res.json({
    ok: true,
    service: "staking-vault-indexer",
  });
});

app.get("/events", async (req, res) => {
  const limit = Number(req.query.limit ?? 20);

  const events = await prisma.vaultEvent.findMany({
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: limit,
  });

  return sendJson(res, events);
});

app.get("/events/:userAddress", async (req, res) => {
  const userAddress = req.params.userAddress.toLowerCase();

  const events = await prisma.vaultEvent.findMany({
    where: {
      userAddress,
    },
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: 50,
  });

  return sendJson(res, events);
});

app.get("/users/:userAddress/summary", async (req, res) => {
  const userAddress = req.params.userAddress.toLowerCase();

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
});

app.get("/reward-rate-history", async (_req, res) => {
  const history = await prisma.vaultEvent.findMany({
    where: {
      eventName: "RewardRateUpdated",
    },
    orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
    take: 50,
  });

  return sendJson(res, history);
});

app.listen(PORT, () => {
  console.log(`Indexer API listening on :${PORT}`);
});