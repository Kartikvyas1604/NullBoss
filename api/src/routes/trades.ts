import { Hono } from 'hono'
import { createPublicClient, http } from 'viem'
import { avalancheFuji, avalanche } from 'viem/chains'

const tradeRouter = new Hono()

const LEDGER_ABI = [
  {
    type: 'function' as const,
    name: 'getTradeCount',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getTrade',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{
      type: 'tuple' as const,
      components: [
        { type: 'bytes32' as const, name: 'tradeId' },
        { type: 'uint256' as const, name: 'agentId' },
        { type: 'address' as const, name: 'tokenIn' },
        { type: 'address' as const, name: 'tokenOut' },
        { type: 'uint256' as const, name: 'amountIn' },
        { type: 'uint256' as const, name: 'amountOut' },
        { type: 'uint256' as const, name: 'fee' },
        { type: 'bytes32' as const, name: 'x402receipt' },
        { type: 'uint256' as const, name: 'timestamp' },
      ],
    }],
    stateMutability: 'view' as const,
  },
] as const

const CHAIN_ID = parseInt(process.env.CHAIN_ID || '43113')
const RPC_URL = process.env.RPC_URL || (CHAIN_ID === 43114
  ? 'https://api.avax.network/ext/bc/C/rpc'
  : 'https://api.avax-test.network/ext/bc/C/rpc')
const CHAIN = CHAIN_ID === 43114 ? avalanche : avalancheFuji

const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65'
const WAVAX = '0x659b28B7EcAbC69A86052D844e1b366c2098A815'
const AGENT_TYPES: Record<number, string> = { 1: 'ORCHESTRATOR', 2: 'ARBITRAGE', 3: 'TREND', 4: 'LIQUIDATION' }

const client = createPublicClient({
  chain: CHAIN,
  transport: http(RPC_URL, { timeout: 8_000 }),
})
const readContract = client.readContract as any

// In-memory cache: refresh every 30s, survive RPC failures
let cache: { trades: any[]; total: number; ts: number } | null = null
const CACHE_TTL = 30_000

async function loadAllTrades(): Promise<{ trades: any[]; total: number }> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache

  const ledgerAddress = process.env.POSITION_LEDGER_ADDRESS as `0x${string}`
  if (!ledgerAddress) return { trades: [], total: 0 }

  try {
    const rawCount = await readContract({
      address: ledgerAddress,
      abi: LEDGER_ABI,
      functionName: 'getTradeCount',
    })
    const total = Number(rawCount as bigint)
    if (total === 0) {
      cache = { trades: [], total: 0, ts: now }
      return cache
    }

    // Batch-fetch all trades in parallel (up to 100)
    const batchSize = Math.min(total, 100)
    const indices = Array.from({ length: batchSize }, (_, i) => BigInt(i))
    const results = await Promise.allSettled(
      indices.map(i =>
        readContract({
          address: ledgerAddress,
          abi: LEDGER_ABI,
          functionName: 'getTrade',
          args: [i],
        })
      )
    )

    const trades: any[] = []
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      const t = result.value as any

      const tokenInSymbol = t.tokenIn.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenIn.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
      const tokenOutSymbol = t.tokenOut.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenOut.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
      const tokenInDecimals = tokenInSymbol === 'USDC' ? 6 : 18
      const tokenOutDecimals = tokenOutSymbol === 'USDC' ? 6 : 18

      const amtIn = Number(t.amountIn) / 10 ** tokenInDecimals
      const amtOut = Number(t.amountOut) / 10 ** tokenOutDecimals
      const sameToken = t.tokenIn.toLowerCase() === t.tokenOut.toLowerCase()
      const pnl = sameToken ? amtOut - amtIn : 0

      trades.push({
        id: t.tradeId,
        agentId: Number(t.agentId),
        agentType: AGENT_TYPES[Number(t.agentId)] || `AGENT_${t.agentId}`,
        tokenIn: tokenInSymbol,
        tokenOut: tokenOutSymbol,
        amountIn: amtIn.toString(),
        amountOut: amtOut.toString(),
        pnl: pnl.toString(),
        status: pnl >= 0 ? 'SETTLED' : 'LOSS',
        timestamp: Number(t.timestamp) * 1000,
        txHash: t.x402receipt !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? t.x402receipt : t.tradeId,
      })
    }

    cache = { trades, total, ts: now }
    return cache
  } catch (err) {
    // Return stale cache on RPC failure
    if (cache) return cache
    return { trades: [], total: 0 }
  }
}

tradeRouter.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = parseInt(c.req.query('pageSize') || '20')
  const { trades, total } = await loadAllTrades()
  const reversed = [...trades].reverse()
  const start = (page - 1) * pageSize
  const paged = reversed.slice(start, start + pageSize)
  return c.json({ trades: paged, total })
})

tradeRouter.get('/:id', async (c) => {
  const { trades } = await loadAllTrades()
  const trade = trades.find((t: any) => t.id === c.req.param('id'))
  if (!trade) return c.json({ error: 'Trade not found' }, 404)
  return c.json(trade)
})

tradeRouter.get('/stream', (c) => {
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  const encoder = new TextEncoder()
  let interval: ReturnType<typeof setInterval>
  const stream = new ReadableStream({
    start(controller) {
      interval = setInterval(async () => {
        const { trades } = await loadAllTrades()
        const recent = trades.slice(-5).reverse()
        if (recent.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'recent_trades', trades: recent })}\n\n`))
        }
      }, 10000)
    },
    cancel() {
      clearInterval(interval)
    }
  })

  return c.body(stream)
})

export { tradeRouter }
