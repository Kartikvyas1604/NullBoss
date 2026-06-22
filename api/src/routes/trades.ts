import { Hono } from 'hono'
import { createPublicClient, http } from 'viem'

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

const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65'
const WAVAX = '0x659b28B7EcAbC69A86052D844e1b366c2098A815'

async function fetchTrades(page: number, pageSize: number) {
  const client = getClient()
  const ledgerAddress = process.env.POSITION_LEDGER_ADDRESS as `0x${string}`
  if (!ledgerAddress) return { trades: [], total: 0 }

  try {
    const rawCount = await client.readContract({
      address: ledgerAddress,
      abi: LEDGER_ABI,
      functionName: 'getTradeCount',
    })
    const total = Number(rawCount as bigint)
    const start = Math.max(0, total - page * pageSize)
    const end = Math.max(0, total - (page - 1) * pageSize)
    const tradeList: any[] = []

    for (let i = start; i < end && i < total; i++) {
      try {
        const raw = await client.readContract({
          address: ledgerAddress,
          abi: LEDGER_ABI,
          functionName: 'getTrade',
          args: [BigInt(i)],
        })
        const t = raw as any
        const tokenInSymbol = t.tokenIn.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenIn.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
        const tokenOutSymbol = t.tokenOut.toLowerCase() === USDC.toLowerCase() ? 'USDC' : t.tokenOut.toLowerCase() === WAVAX.toLowerCase() ? 'WAVAX' : '???'
        const tokenInDecimals = tokenInSymbol === 'USDC' ? 6 : 18
        const tokenOutDecimals = tokenOutSymbol === 'USDC' ? 6 : 18

        const AGENT_TYPES: Record<number, string> = { 1: 'ORCHESTRATOR', 2: 'ARBITRAGE', 3: 'TREND', 4: 'LIQUIDATION' }

        const amtIn = Number(t.amountIn) / 10 ** tokenInDecimals
        const amtOut = Number(t.amountOut) / 10 ** tokenOutDecimals
        const sameToken = t.tokenIn.toLowerCase() === t.tokenOut.toLowerCase()
        const pnl = sameToken ? amtOut - amtIn : 0

        tradeList.push({
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
      } catch {}
    }

    return { trades: tradeList.reverse(), total }
  } catch {
    return { trades: [], total: 0 }
  }
}

tradeRouter.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = parseInt(c.req.query('pageSize') || '20')
  const result = await fetchTrades(page, pageSize)
  return c.json(result)
})

tradeRouter.get('/:id', async (c) => {
  const { trades } = await fetchTrades(1, 100)
  const trade = trades.find((t: any) => t.id === c.req.param('id'))
  if (!trade) return c.json({ error: 'Trade not found' }, 404)
  return c.json(trade)
})

tradeRouter.get('/stream', (c) => {
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(async () => {
        try {
          const { trades } = await fetchTrades(1, 5)
          if (trades.length > 0) {
            controller.enqueue(`data: ${JSON.stringify({ type: 'recent_trades', trades })}\n\n`)
          }
        } catch {}
      }, 10000)

      c.eventListener.addEventListener('close', () => clearInterval(interval))
    }
  })

  return c.body(stream)
})

export { tradeRouter }
