import { Hono } from 'hono'
import { createPublicClient, http } from 'viem'

const feeRouter = new Hono()

function getClient() {
  const chainId = parseInt(process.env.CHAIN_ID || '43113')
  const rpc = chainId === 43114
    ? 'https://api.avax.network/ext/bc/C/rpc'
    : 'https://api.avax-test.network/ext/bc/C/rpc'
  return createPublicClient({
    chain: { id: chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [rpc] } } },
    transport: http(rpc)
  })
}

const FEE_ROUTER_ABI = [
  { type: 'function' as const, name: 'parentPercent', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'subAgentPercent', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'treasuryPercent', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'treasury', inputs: [], outputs: [{ type: 'address' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'owner', inputs: [], outputs: [{ type: 'address' as const }], stateMutability: 'view' as const },
] as const

feeRouter.get('/breakdown', async (c) => {
  const client = getClient()
  const feeRouterAddress = process.env.FEE_ROUTER_ADDRESS as `0x${string}`
  if (!feeRouterAddress) return c.json({ error: 'FeeRouter not configured' }, 500)

  try {
    const [parentPct, subAgentPct, treasuryPct, treasuryAddr, ownerAddr] = await Promise.all([
      client.readContract({ address: feeRouterAddress, abi: FEE_ROUTER_ABI, functionName: 'parentPercent' }),
      client.readContract({ address: feeRouterAddress, abi: FEE_ROUTER_ABI, functionName: 'subAgentPercent' }),
      client.readContract({ address: feeRouterAddress, abi: FEE_ROUTER_ABI, functionName: 'treasuryPercent' }),
      client.readContract({ address: feeRouterAddress, abi: FEE_ROUTER_ABI, functionName: 'treasury' }),
      client.readContract({ address: feeRouterAddress, abi: FEE_ROUTER_ABI, functionName: 'owner' }),
    ])

    return c.json({
      parentPercent: parentPct.toString(),
      subAgentPercent: subAgentPct.toString(),
      treasuryPercent: treasuryPct.toString(),
      treasury: treasuryAddr,
      owner: ownerAddr,
      bpsDenominator: 10000,
    })
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'RPC error' }, 500)
  }
})

feeRouter.get('/history', async (c) => {
  const client = getClient()
  const feeRouterAddress = process.env.FEE_ROUTER_ADDRESS as `0x${string}`
  if (!feeRouterAddress) return c.json({ history: [], total: 0 })

  try {
    const mgmtEvents = await client.getLogs({
      address: feeRouterAddress,
      event: {
        type: 'event' as const,
        name: 'ManagementFeeDistributed',
        inputs: [
          { type: 'uint256' as const, name: 'agentId', indexed: true },
          { type: 'uint256' as const, name: 'amount' },
          { type: 'address' as const, name: 'caller', indexed: true },
        ],
      },
      fromBlock: 0n,
      toBlock: 'latest' as const,
    })
    const perfEvents = await client.getLogs({
      address: feeRouterAddress,
      event: {
        type: 'event' as const,
        name: 'PerformanceFeeDistributed',
        inputs: [
          { type: 'uint256' as const, name: 'agentId', indexed: true },
          { type: 'uint256' as const, name: 'amount' },
          { type: 'address' as const, name: 'caller', indexed: true },
        ],
      },
      fromBlock: 0n,
      toBlock: 'latest' as const,
    })

    return c.json({
      managementEvents: mgmtEvents.map(e => ({
        agentId: Number(e.args.agentId),
        amount: e.args.amount?.toString(),
        caller: e.args.caller,
      })),
      performanceEvents: perfEvents.map(e => ({
        agentId: Number(e.args.agentId),
        amount: e.args.amount?.toString(),
        caller: e.args.caller,
      })),
      totalMgmt: mgmtEvents.length,
      totalPerf: perfEvents.length,
    })
  } catch (err) {
    return c.json({ history: [], total: 0 })
  }
})

export { feeRouter }
