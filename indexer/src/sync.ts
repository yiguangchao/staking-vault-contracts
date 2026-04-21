import { Prisma } from '@prisma/client'
import { createPublicClient, http } from 'viem'
import { config } from './config'
import { prisma } from './db'
import { vaultEvents } from './vaultAbi'

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
    tx: Prisma.TransactionClient,
    eventName: string,
    userAddress: string,
    amount: bigint
) {
    const user = userAddress.toLowerCase()

    const current = await tx.userPositionSnapshot.findUnique({
        where: { userAddress: user },
    })

    const totalStakedIn = BigInt(current?.totalStakedIn ?? '0')
    const totalWithdrawn = BigInt(current?.totalWithdrawn ?? '0')
    const totalRewardsPaid = BigInt(current?.totalRewardsPaid ?? '0')

    await tx.userPositionSnapshot.upsert({
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

async function main() {
    const state = await prisma.indexedState.findUnique({
        where: { id: 1 },
    })

    const fromBlock = state?.lastSyncedBlock ?? config.startBlock
    const latestBlock = await client.getBlockNumber()

    console.log(`Syncing from block ${fromBlock} to ${latestBlock}...`)

    if (fromBlock > latestBlock) {
        console.log('No new blocks to sync.')
        return
    }

    const logs = await client.getLogs({
        address: config.vaultAddress,
        events: vaultEvents,
        fromBlock,
        toBlock: latestBlock,
    })

    console.log(`Fetched ${logs.length} logs`)

    for (const log of logs) {
        if (!log.transactionHash || log.logIndex === undefined) continue
        if (!log.blockNumber || !log.blockHash) continue

        const eventId = toEventId(log.transactionHash, Number(log.logIndex))
        const eventName = log.eventName
        const args = log.args as Record<string, unknown>

        await prisma.$transaction(async (tx) => {
            const exists = await tx.vaultEvent.findUnique({
                where: { id: eventId },
            })

            if (exists) {
                return
            }

            const userAddress =
                typeof args.user === 'string' ? args.user.toLowerCase() : null

            const amount =
                typeof args.amount === 'bigint' ? args.amount.toString() : null

            const newRewardRate =
                typeof args.newRewardRate === 'bigint'
                    ? args.newRewardRate.toString()
                    : null

            await tx.vaultEvent.create({
                data: {
                    id: eventId,
                    chainId: config.chainId,
                    contractAddress: config.vaultAddress,
                    blockNumber: log.blockNumber,
                    blockHash: log.blockHash,
                    transactionHash: log.transactionHash,
                    logIndex: Number(log.logIndex),
                    eventName,
                    userAddress,
                    amount,
                    newRewardRate,
                    rawData: stringifyBigInt(args),
                },
            })

            if (
                (eventName === 'Staked' ||
                    eventName === 'Withdrawn' ||
                    eventName === 'RewardPaid') &&
                typeof args.user === 'string' &&
                typeof args.amount === 'bigint'
            ) {
                await updateUserSnapshot(tx, eventName, args.user, args.amount)
            }

            await tx.indexedState.upsert({
                where: { id: 1 },
                update: {
                    lastSyncedBlock: log.blockNumber + 1n,
                },
                create: {
                    id: 1,
                    lastSyncedBlock: log.blockNumber + 1n,
                },
            })
        })

        console.log(`Indexed ${eventName} @ tx ${log.transactionHash}`)
    }

    console.log('Sync complete.')
}

main()
    .catch((error) => {
        console.error('Sync failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
