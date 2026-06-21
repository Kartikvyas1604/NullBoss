import { Hono } from 'hono'

const tradeRouter = new Hono()

const TRADES = [
  { id: '0xt1', agentId: 2, agentType: 'ARBITRAGE', tokenIn: 'AVAX', tokenOut: 'USDC', amountIn: '1000000000', amountOut: '1050000000', pnl: '50000000', status: 'SETTLED', timestamp: Date.now() - 60000, txHash: '0xabc...' },
  { id: '0xt2', agentId: 3, agentType: 'TREND', tokenIn: 'USDC', tokenOut: 'AVAX', amountIn: '500000000', amountOut: '515000000', pnl: '15000000', status: 'SETTLED', timestamp: Date.now() - 120000, txHash: '0xdef...' },
]

tradeRouter.get('/', (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const pageSize = parseInt(c.req.query('pageSize') || '20')
  return c.json({ trades: TRADES, total: TRADES.length, page, pageSize })
})

tradeRouter.get('/:id', (c) => {
  const trade = TRADES.find(t => t.id === c.req.param('id'))
  if (!trade) return c.json({ error: 'Trade not found' }, 404)
  return c.json(trade)
})

tradeRouter.get('/stream', (c) => {
  c.header('Content-Type', 'text/event-stream')
  c.header('Cache-Control', 'no-cache')
  c.header('Connection', 'keep-alive')

  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => {
        const trade = {
          id: `0x${Math.random().toString(36).slice(2)}`,
          agentId: Math.random() > 0.5 ? 2 : 3,
          agentType: Math.random() > 0.5 ? 'ARBITRAGE' : 'TREND',
          pnl: Math.floor(Math.random() * 100000).toString(),
          timestamp: Date.now()
        }
        controller.enqueue(`data: ${JSON.stringify(trade)}\n\n`)
      }, 5000)

      c.eventListener.addEventListener('close', () => clearInterval(interval))
    }
  })

  return c.body(stream)
})

export { tradeRouter }
