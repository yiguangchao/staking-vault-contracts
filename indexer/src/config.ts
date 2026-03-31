import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing env: ${name}`)
  }
  return value
}

export const config = {
  rpcUrl: required('RPC_URL'),
  chainId: Number(required('CHAIN_ID')),
  vaultAddress: required('VAULT_ADDRESS') as `0x${string}`,
  startBlock: BigInt(required('START_BLOCK')),
  port: Number(process.env.PORT ?? 4000),
}