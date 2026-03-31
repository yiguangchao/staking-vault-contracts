import 'dotenv/config'
import cors from "cors";
import express from 'express'
import { prisma } from './db'
import { config } from './config'

const app = express()

app.use(
  cors({
    origin: "http://localhost:3000",
  }),
);
app.use(express.json())

app.get('/health', async (_req, res) => {
  res.json({ ok: true })
})

app.get('/events', async (req, res) => {
  const limit = Number(req.query.limit ?? 20)

  const events = await prisma.vaultEvent.findMany({
    orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
    take: limit,
  })

  res.json(events)
})

app.get('/events/:userAddress', async (req, res) => {
  const userAddress = req.params.userAddress.toLowerCase()

  const events = await prisma.vaultEvent.findMany({
    where: { userAddress },
    orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
  })

  res.json(events)
})

app.get('/users/:userAddress/summary', async (req, res) => {
  const userAddress = req.params.userAddress.toLowerCase()

  const summary = await prisma.userPositionSnapshot.findUnique({
    where: { userAddress },
  })

  res.json(summary ?? null)
})

app.get('/reward-rate-history', async (_req, res) => {
  const history = await prisma.vaultEvent.findMany({
    where: { eventName: 'RewardRateUpdated' },
    orderBy: [{ blockNumber: 'desc' }, { logIndex: 'desc' }],
  })

  res.json(history)
})

app.listen(config.port, () => {
  console.log(`Indexer API listening on :${config.port}`)
})