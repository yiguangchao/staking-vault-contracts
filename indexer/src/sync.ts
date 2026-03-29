import { createPublicClient, http, parseAbiItem } from 'viem'
import { prisma } from './db'
import { config } from './config'

const client = createPublicClient({
    transport: http(config.rpcUrl),
})

const events = [
    parseAbiItem('event Staked(address indexed user, uint256 amount)'),
    parseAbiItem('event Withdrawn(address indexed user, uint256 amount)'),
    parseAbiItem('event RewardPaid(address indexed user, uint256 amount)'),
    parseAbiItem('event RewardRateUpdated(uint256 newRewardRate)'),
]

async function main() {
    const state = await prisma.indexedState.findUnique({ where: { id: 1 } })
    const fromBlock = state?.lastSyncedBlock ?? config.startBlock
    const latestBlock = await client.getBlockNumber()

    console.log(`syncing from ${fromBlock} to ${latestBlock}`)

    const logs = await client.getLogs({
        address: config.vaultAddress,
        events,
        fromBlock,
        toBlock: latestBlock,
    })

    for (const log of logs) {
        const eventId = `${config.chainId}-${log.transactionHash}-${log.logIndex}`

        await prisma.$transaction(async (tx) => {
            const exists = await tx.vaultEvent.findUnique({
                where: { id: eventId },
            })
            if (exists) return

            const eventName = log.eventName
            const args = log.args as Record<string, unknown>

            await tx.vaultEvent.create({
                data: {
                    id: eventId,
                    chainId: config.chainId,
                    contractAddress: config.vaultAddress,
                    blockNumber: log.blockNumber!,
                    blockHash: log.blockHash!,
                    transactionHash: log.transactionHash!,
                    logIndex: Number(log.logIndex),
                    eventName,
                    userAddress:
                        typeof args.user === 'string' ? args.user.toLowerCase() : null,
                    amount:
                        typeof args.amount === 'bigint' ? args.amount.toString() : null,
                    newRewardRate:
                        typeof args.newRewardRate === 'bigint'
                            ? args.newRewardRate.toString()
                            : null,
                    rawData: JSON.stringify(
                        args,
                        (_, v) => (typeof v === 'bigint' ? v.toString() : v)
                    ),
                },
            })

            if (
                eventName === 'Staked' ||
                eventName === 'Withdrawn' ||
                eventName === 'RewardPaid'
            ) {
                const user = String(args.user).toLowerCase()
                const amount = BigInt(args.amount as bigint)

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
                        totalRewardsPaid:
                            eventName === 'RewardPaid' ? amount.toString() : '0',
                    },
                })
            }

            await tx.indexedState.upsert({
                where: { id: 1 },
                update: { lastSyncedBlock: log.blockNumber! + 1n },
                create: { id: 1, lastSyncedBlock: log.blockNumber! + 1n },
            })
        })
    }

    console.log(`done. indexed ${logs.length} logs`)
}

main()
    .catch((err) => {
        console.error(err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })