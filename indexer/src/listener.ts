import { createPublicClient, http, parseAbiItem } from 'viem'
import { config } from './config'
import { prisma } from './db'

const client = createPublicClient({
  transport: http(config.rpcUrl),
})

async function handleLog(log: any) {
  const eventId = `${config.chainId}-${log.transactionHash}-${log.logIndex}`

  const exists = await prisma.vaultEvent.findUnique({
    where: { id: eventId },
  })
  if (exists) return

  const args = log.args as Record<string, unknown>

  await prisma.vaultEvent.create({
    data: {
      id: eventId,
      chainId: config.chainId,
      contractAddress: config.vaultAddress,
      blockNumber: log.blockNumber!,
      blockHash: log.blockHash!,
      transactionHash: log.transactionHash!,
      logIndex: Number(log.logIndex),
      eventName: log.eventName,
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

  console.log('indexed:', log.eventName, log.transactionHash)
}

client.watchEvent({
  address: config.vaultAddress,
  event: parseAbiItem('event Staked(address indexed user, uint256 amount)'),
  onLogs: (logs) => logs.forEach(handleLog),
})

client.watchEvent({
  address: config.vaultAddress,
  event: parseAbiItem('event Withdrawn(address indexed user, uint256 amount)'),
  onLogs: (logs) => logs.forEach(handleLog),
})

client.watchEvent({
  address: config.vaultAddress,
  event: parseAbiItem('event RewardPaid(address indexed user, uint256 amount)'),
  onLogs: (logs) => logs.forEach(handleLog),
})

client.watchEvent({
  address: config.vaultAddress,
  event: parseAbiItem('event RewardRateUpdated(uint256 newRewardRate)'),
  onLogs: (logs) => logs.forEach(handleLog),
})

console.log('listener started...')