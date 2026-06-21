import { Hono } from 'hono'

const agentRouter = new Hono()

const AGENTS = [
  { id: 1, name: 'Orchestrator', type: 'ORCHESTRATOR', status: 'running', confidence: 92, tradesToday: 0, pnlToday: '0' },
  { id: 2, name: 'Arbitrage Hunter', type: 'ARBITRAGE', status: 'running', confidence: 78, tradesToday: 12, pnlToday: '450000' },
  { id: 3, name: 'Trend Follower', type: 'TREND', status: 'running', confidence: 85, tradesToday: 3, pnlToday: '1200000' },
  { id: 4, name: 'Liquidation Scout', type: 'LIQUIDATION', status: 'idle', confidence: 45, tradesToday: 0, pnlToday: '0' },
]

agentRouter.get('/', (c) => {
  return c.json({ agents: AGENTS })
})

agentRouter.get('/:id', (c) => {
  const id = parseInt(c.req.param('id'))
  const agent = AGENTS.find(a => a.id === id)
  if (!agent) return c.json({ error: 'Agent not found' }, 404)
  return c.json(agent)
})

agentRouter.get('/:id/reputation', (c) => {
  return c.json({
    agentId: parseInt(c.req.param('id')),
    totalTrades: 145,
    successfulTrades: 132,
    successRate: 0.91,
    totalPnl: '245000000',
    averageConfidence: 72
  })
})

agentRouter.get('/org-chart', (c) => {
  return c.json({
    root: {
      id: 1,
      name: 'Orchestrator',
      type: 'ORCHESTRATOR',
      children: [
        { id: 2, name: 'Arbitrage Hunter', type: 'ARBITRAGE', status: 'running', parentId: 1 },
        { id: 3, name: 'Trend Follower', type: 'TREND', status: 'running', parentId: 1 },
        { id: 4, name: 'Liquidation Scout', type: 'LIQUIDATION', status: 'idle', parentId: 1 },
      ]
    }
  })
})

export { agentRouter }
