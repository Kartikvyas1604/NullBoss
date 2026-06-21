import { Hono } from 'hono'
import { SiweMessage, generateNonce } from 'siwe'

const authRouter = new Hono()
const nonces = new Map<string, { nonce: string, expiry: number }>()

authRouter.get('/nonce', (c) => {
  const nonce = generateNonce()
  nonces.set(nonce, { nonce, expiry: Date.now() + 300000 })
  return c.json({ nonce })
})

authRouter.post('/login', async (c) => {
  const { message, signature } = await c.req.json()

  try {
    const siweMessage = new SiweMessage(message)
    const fields = await siweMessage.verify({ signature })

    const token = Buffer.from(`nullboss:${fields.address}:${Date.now()}`).toString('base64')

    return c.json({
      token,
      address: fields.address,
      chainId: fields.chainId
    })
  } catch (error) {
    return c.json({ error: 'Invalid signature' }, 401)
  }
})

authRouter.get('/session', (c) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'No session' }, 401)
  }
  const token = auth.slice(7)
  const decoded = Buffer.from(token, 'base64').toString()
  const [prefix, address, timestamp] = decoded.split(':')

  if (prefix !== 'nullboss') {
    return c.json({ error: 'Invalid token' }, 401)
  }

  return c.json({ address, authenticated: true })
})

export { authRouter }
