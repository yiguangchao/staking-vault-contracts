import { createPublicClient, http } from 'viem'
import { config } from './config'
import { prisma } from './db'
import {
  STAKED_EVENT,
  WITHDRAWN_EVENT,
  REWARD_PAID_EVENT,
  REWARD_RATE_UPDATED_EVENT,
} from './vaultAbi'

const client = createPublicClient({
  transport: http(config.rpcUrl),
})

function stringifyBigInt(value: unknown): string {
  return JSON.stringify(value, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  )
}

function toEventId(txHash: string, logIndex: number) {
  return `${config.chainId}-${txHash}-${logIndex}`
}

async function updateUserSnapshot(
  eventName: string,
  userAddress: string,
  amount: bigint
) {
  const user = userAddress.toLowerCase()

  const current = await prisma.userPositionSnapshot.findUnique({
    where: { userAddress: user },
  })

  const totalStakedIn = BigInt(current?.totalStakedIn ?? '0')
  const totalWithdrawn = BigInt(current?.totalWithdrawn ?? '0')
  const totalRewardsPaid = BigInt(current?.totalRewardsPaid ?? '0')

  await prisma.userPositionSnapshot.upsert({
    where: { userAddress: user },
    update: {
      totalStakedIn:
        eventName === 'Staked'
          ? (totalStakedIn + amount).toString()
          : totalStakedIn.toString(),
      totalWithdrawn:
        eventName === 'Withdrawn'
          ? (totalWithdrawn + amount).toString()
          : totalWithdrawn.toString(),
      totalRewardsPaid:
        eventName === 'RewardPaid'
          ? (totalRewardsPaid + amount).toString()
          : totalRewardsPaid.toString(),
    },
    create: {
      id: user,
      userAddress: user,
      totalStakedIn: eventName === 'Staked' ? amount.toString() : '0',
      totalWithdrawn: eventName === 'Withdrawn' ? amount.toString() : '0',
      totalRewardsPaid: eventName === 'RewardPaid' ? amount.toString() : '0',
    },
  })
}

async function handleLogs(logs: any[]) {
  for (const log of logs) {
    if (!log.transactionHash || log.logIndex === undefined) continue
    if (!log.blockNumber || !log.blockHash) continue

    const eventId = toEventId(log.transactionHash, Number(log.logIndex))
    const args = log.args as Record<string, unknown>

    const exists = await prisma.vaultEvent.findUnique({
      where: { id: eventId },
    })

    if (exists) continue

    const userAddress =
      typeof args.user === 'string' ? args.user.toLowerCase() : null

    const amount =
      typeof args.amount === 'bigint' ? args.amount.toString() : null

    const newRewardRate =
      typeof args.newRewardRate === 'bigint'
        ? args.newRewardRate.toString()
        : null

    await prisma.vaultEvent.create({
      data: {
        id: eventId,
        chainId: config.chainId,
        contractAddress: config.vaultAddress,
        blockNumber: log.blockNumber,
        blockHash: log.blockHash,
        transactionHash: log.transactionHash,
        logIndex: Number(log.logIndex),
        eventName: log.eventName,
        userAddress,
        amount,
        newRewardRate,
        rawData: stringifyBigInt(args),
      },
    })

    if (
      (log.eventName === 'Staked' ||
        log.eventName === 'Withdrawn' ||
        log.eventName === 'RewardPaid') &&
      typeof args.user === 'string' &&
      typeof args.amount === 'bigint'
    ) {
      await updateUserSnapshot(log.eventName, args.user, args.amount)
    }

    await prisma.indexedState.upsert({
      where: { id: 1 },
      update: {
        lastSyncedBlock: log.blockNumber + 1n,
      },
      create: {
        id: 1,
        lastSyncedBlock: log.blockNumber + 1n,
      },
    })

    console.log(`Realtime indexed ${log.eventName} @ ${log.transactionHash}`)
  }
}

client.watchEvent({
  address: config.vaultAddress,
  event: STAKED_EVENT,
  onLogs: handleLogs,
})

client.watchEvent({
  address: config.vaultAddress,
  event: WITHDRAWN_EVENT,
  onLogs: handleLogs,
})

client.watchEvent({
  address: config.vaultAddress,
  event: REWARD_PAID_EVENT,
  onLogs: handleLogs,
})

client.watchEvent({
  address: config.vaultAddress,
  event: REWARD_RATE_UPDATED_EVENT,
  onLogs: handleLogs,
})

console.log('Indexer listener started...')