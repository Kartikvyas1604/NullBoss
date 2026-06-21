import { Hono } from 'hono'
import { createPublicClient, http, parseAbi } from 'viem'

const vaultRouter = new Hono()
const VAULT_ABI = parseAbi([
  'function totalAssets() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function convertToShares(uint256 assets) view returns (uint256)',
  'function convertToAssets(uint256 shares) view returns (uint256)',
  'function highWaterMark() view returns (uint256)',
  'function paused() view returns (bool)',
  'function emergencyGuardian() view returns (address)',
  'function pauseInitiatedAt() view returns (uint256)',
  'event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)',
  'event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)'
])

function getClient(c: any) {
  const chainId = parseInt(process.env.CHAIN_ID || '43113')
  const rpc = chainId === 43114
    ? 'https://api.avax.network/ext/bc/C/rpc'
    : 'https://api.avax-test.network/ext/bc/C/rpc'
  return createPublicClient({
    chain: {
      id: chainId,
      name: 'Avalanche',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: { default: { http: [rpc] } }
    },
    transport: http(rpc)
  })
}

vaultRouter.get('/state', async (c) => {
  const client = getClient(c)
  const vaultAddress = process.env.VAULT_ADDRESS as `0x${string}`

  const [totalAssets, totalSupply, highWaterMark, paused, emergencyGuardian, pauseInitiatedAt] =
    await Promise.all([
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'totalAssets' }),
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'totalSupply' }),
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'highWaterMark' }),
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'paused' }),
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'emergencyGuardian' }),
      client.readContract({ address: vaultAddress, abi: VAULT_ABI, functionName: 'pauseInitiatedAt' })
    ])

  const sharePrice = totalSupply > 0n ? (totalAssets * BigInt(10 ** 18)) / totalSupply : BigInt(10 ** 18)

  return c.json({
    totalAssets: totalAssets.toString(),
    totalSupply: totalSupply.toString(),
    sharePrice: sharePrice.toString(),
    highWaterMark: highWaterMark.toString(),
    paused,
    emergencyGuardian,
    pauseInitiatedAt: pauseInitiatedAt.toString(),
    timestamp: Date.now()
  })
})

vaultRouter.get('/deposits', async (c) => {
  return c.json({ deposits: [], total: 0 })
})

vaultRouter.get('/withdrawals', async (c) => {
  return c.json({ withdrawals: [], total: 0 })
})

export { vaultRouter }
