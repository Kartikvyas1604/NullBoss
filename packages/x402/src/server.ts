import type { X402PaymentRequest } from './types'

export function createX402Middleware(config: {
  price: bigint
  token: `0x${string}`
  recipient: `0x${string}`
  verifyPayment: (hash: string) => Promise<boolean>
}) {
  return async (request: Request): Promise<Response | null> => {
    const paymentHash = request.headers.get('X-Payment-Hash')

    if (!paymentHash) {
      return new Response(JSON.stringify({
        status: 402,
        paymentUrl: '/api/payments',
        amount: config.price.toString(),
        token: config.token,
        recipient: config.recipient,
        chainId: 43114
      } satisfies X402PaymentRequest), {
        status: 402,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const isValid = await config.verifyPayment(paymentHash)
    if (!isValid) {
      return new Response('Invalid payment', { status: 402 })
    }

    return null
  }
}
