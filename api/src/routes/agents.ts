import { Hono } from 'hono'
import { createPublicClient, http } from 'viem'
import { avalancheFuji, avalanche } from 'viem/chains'

const agentRouter = new Hono()

const CHAIN_ID = parseInt(process.env.CHAIN_ID || '43113')
const RPC_URL = process.env.RPC_URL || (CHAIN_ID === 43114
  ? 'https://api.avax.network/ext/bc/C/rpc'
  : 'https://api.avax-test.network/ext/bc/C/rpc')
const CHAIN = CHAIN_ID === 43114 ? avalanche : avalancheFuji

const client = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL, { timeout: 8_000 }),
})
const readContract = client.readContract as any

const REGISTRY_ABI = [
  {
    type: 'function' as const,
    name: 'getAgent',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{
      type: 'tuple' as const,
      components: [
        { type: 'uint256' as const, name: 'agentId' },
        { type: 'address' as const, name: 'owner' },
        { type: 'uint256' as const, name: 'parentAgentId' },
        { type: 'string' as const, name: 'metadataUri' },
        { type: 'bool' as const, name: 'registered' },
        { type: 'uint256' as const, name: 'revokedAt' },
      ],
    }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'isAgentActive',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{ type: 'bool' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getReputation',
    inputs: [{ type: 'uint256' as const }],
    outputs: [
      { type: 'uint256' as const, name: 'totalTrades' },
      { type: 'uint256' as const, name: 'successfulTrades' },
    ],
    stateMutability: 'view' as const,
  },
] as const

const AGENT_LABELS: Record<number, { name: string; type: string }> = {
  1: { name: 'Orchestrator', type: 'ORCHESTRATOR' },
  2: { name: 'Arbitrage Hunter', type: 'ARBITRAGE' },
  3: { name: 'Trend Follower', type: 'TREND' },
  4: { name: 'Liquidation Scout', type: 'LIQUIDATION' },
}

async function fetchAgents() {
  const registryAddress = process.env.REGISTRY_ADDRESS as `0x${string}`
  if (!registryAddress) return []

  const agents: any[] = []
  for (let i = 1; i <= 10; i++) {
    try {
      const agent = await readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'getAgent',
        args: [BigInt(i)],
      })
      const a = agent as any
      if (!a.registered) continue

      const isActive = await readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'isAgentActive',
        args: [BigInt(i)],
      })

      let totalTrades = 0
      let successfulTrades = 0
      try {
        const rep = await readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: 'getReputation',
          args: [BigInt(i)],
        })
        totalTrades = Number((rep as any)[0])
        successfulTrades = Number((rep as any)[1])
      } catch {}

      const label = AGENT_LABELS[i] || { name: `Agent #${i}`, type: 'UNKNOWN' }

      const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0
      const confidence = Math.round(successRate * 100)

      agents.push({
        id: i,
        name: label.name,
        type: label.type,
        status: isActive ? 'running' : 'idle',
        confidence,
        tradesToday: totalTrades,
        successfulTrades,
        pnlToday: '0',
        parentId: Number(a.parentAgentId) || null,
        owner: a.owner,
      })
    } catch {
      break
    }
  }
  return agents
}

agentRouter.get('/', async (c) => {
  const agents = await fetchAgents()
  return c.json({ agents })
})

agentRouter.get('/:id', async (c) => {
  const agents = await fetchAgents()
  const id = parseInt(c.req.param('id'))
  const agent = agents.find(a => a.id === id)
  if (!agent) return c.json({ error: 'Agent not found' }, 404)
  return c.json(agent)
})

agentRouter.get('/:id/reputation', async (c) => {
  const registryAddress = process.env.REGISTRY_ADDRESS as `0x${string}`
  const agentId = parseInt(c.req.param('id'))

  try {
    const rep = await readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getReputation',
      args: [BigInt(agentId)],
    })
    const totalTrades = Number((rep as any)[0])
    const successfulTrades = Number((rep as any)[1])
    const successRate = totalTrades > 0 ? successfulTrades / totalTrades : 0
    return c.json({
      agentId,
      totalTrades,
      successfulTrades,
      successRate,
      averageConfidence: Math.round(successRate * 100),
    })
  } catch {
    return c.json({ error: 'Agent not found' }, 404)
  }
})

agentRouter.get('/org-chart', async (c) => {
  const agents = await fetchAgents()
  const parent = agents.find(a => !a.parentId)
  const children = agents.filter(a => a.parentId)

  return c.json({
    root: parent ? {
      id: parent.id,
      name: parent.name,
      type: parent.type,
      children: children.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        parentId: parent.id,
      })),
    } : null
  })
})

export { agentRouter }
