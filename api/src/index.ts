import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { v1Router } from './routes/v1'
import { wsManager } from './ws/manager'

const app = new Hono()

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://nullboss.app'],
  credentials: true,
}))
app.use('*', logger())
app.use('*', secureHeaders())

app.route('/api/v1', v1Router)

app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: Date.now(),
  version: '0.1.0',
  network: process.env.CHAIN_ID === '43114' ? 'mainnet' : 'fuji'
}))

const port = parseInt(process.env.PORT || '3001')
const server = serve({
  fetch: app.fetch,
  port,
  websocket: wsManager.getWebSocketHandler()
})

console.log(`NULLBOSS API running on port ${port}`)
export default app
