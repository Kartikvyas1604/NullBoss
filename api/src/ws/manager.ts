import { createPublicClient, http } from 'viem'
import { avalancheFuji } from 'viem/chains'

type WebSocketLike = {
  send(data: string): void
}

type WebSocketHandler = {
  open?: (ws: WebSocketLike) => void
  message?: (ws: WebSocketLike, message: { toString(): string }) => void
  close?: (ws: WebSocketLike) => void
}

interface WSClient {
  id: string
  socket: WebSocketLike
  subscriptions: Set<string>
}

const RPC_URL = process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'
const client = createPublicClient({
  chain: avalancheFuji,
  transport: http(RPC_URL, { timeout: 8_000 }),
})
const readContract = client.readContract as any

const VAULT_ABI = [
  { type: 'function' as const, name: 'totalAssets', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'totalSupply', inputs: [], outputs: [{ type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'paused', inputs: [], outputs: [{ type: 'bool' as const }], stateMutability: 'view' as const },
] as const

const REGISTRY_ABI = [
  { type: 'function' as const, name: 'getReputation', inputs: [{ type: 'uint256' as const }], outputs: [{ type: 'uint256' as const }, { type: 'uint256' as const }], stateMutability: 'view' as const },
  { type: 'function' as const, name: 'isAgentActive', inputs: [{ type: 'uint256' as const }], outputs: [{ type: 'bool' as const }], stateMutability: 'view' as const },
] as const

class WSManager {
  private clients: Map<string, WSClient> = new Map()
  private heartbeatInterval: ReturnType<typeof setInterval>
  private vaultAddress = process.env.VAULT_ADDRESS as `0x${string}`
  private registryAddress = process.env.REGISTRY_ADDRESS as `0x${string}`

  constructor() {
    this.heartbeatInterval = setInterval(() => this.broadcastHeartbeat(), 10000)
  }

  getWebSocketHandler(): WebSocketHandler {
    return {
      open: (ws) => {
        const id = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`
        this.clients.set(id, { id, socket: ws, subscriptions: new Set(['heartbeat']) })
        this.send(ws, { type: 'connected', clientId: id })
      },
      message: (ws, message) => {
        try {
          const data = JSON.parse(message.toString())
          this.handleMessage(ws, data)
        } catch { /* ignore malformed messages */ }
      },
      close: (ws) => {
        for (const [id, client] of this.clients) {
          if ((client.socket as any) === ws) {
            this.clients.delete(id)
            break
          }
        }
      }
    }
  }

  private handleMessage(socket: WebSocketLike, data: any) {
    switch (data.type) {
      case 'subscribe':
        for (const [, client] of this.clients) {
          if (client.socket === socket) {
            if (data.channel) client.subscriptions.add(data.channel)
            break
          }
        }
        break
      case 'unsubscribe':
        for (const [, client] of this.clients) {
          if (client.socket === socket) {
            if (data.channel) client.subscriptions.delete(data.channel)
            break
          }
        }
        break
    }
  }

  private send(ws: WebSocketLike, data: any) {
    try { ws.send(JSON.stringify(data)) } catch { /* drop */ }
  }

  async broadcastHeartbeat() {
    let nav = { sharePrice: '0', totalAssets: '0', dailyPnl: '0' }
    let agentData = {
      arbitrage: { status: 'unknown' as const, confidence: 0 },
      trend: { status: 'unknown' as const, confidence: 0 },
      liquidation: { status: 'unknown' as const, confidence: 0 },
      orchestrator: { status: 'unknown' as const, confidence: 0 },
    }

    try {
      if (this.vaultAddress) {
        const [totalAssets, totalSupply] = await Promise.all([
          readContract({ address: this.vaultAddress, abi: VAULT_ABI, functionName: 'totalAssets' }),
          readContract({ address: this.vaultAddress, abi: VAULT_ABI, functionName: 'totalSupply' }),
        ])
        const ta = Number(totalAssets as bigint) / 1e6
        const ts = Number(totalSupply as bigint) / 1e18
        nav = {
          sharePrice: (ts > 0 ? (ta / ts) : 1).toFixed(6),
          totalAssets: ta.toFixed(2),
          dailyPnl: '0',
        }
      }
    } catch {}

    try {
      if (this.registryAddress) {
        const results = await Promise.allSettled(
          [2, 3, 4, 1].map(id =>
            readContract({ address: this.registryAddress, abi: REGISTRY_ABI, functionName: 'getReputation', args: [BigInt(id)] })
              .then((r: any) => ({ id, total: Number(r[0]), success: Number(r[1]) }))
          )
        )
        const agents: Record<string, { status: string; confidence: number }> = { arbitrage: { status: 'unknown', confidence: 0 }, trend: { status: 'unknown', confidence: 0 }, liquidation: { status: 'unknown', confidence: 0 }, orchestrator: { status: 'unknown', confidence: 0 } }
        const labels = ['orchestrator', 'arbitrage', 'trend', 'liquidation']
        for (const r of results) {
          if (r.status === 'fulfilled') {
            const idx = labels[r.value.id - 1]
            if (idx) {
              agents[idx] = {
                status: r.value.total > 0 ? 'running' : 'idle',
                confidence: r.value.total > 0 ? Math.round((r.value.success / r.value.total) * 100) : 0,
              }
            }
          }
        }
        agentData = agents as any
      }
    } catch {}

    const heartbeat = {
      type: 'heartbeat',
      timestamp: Date.now(),
      agents: agentData,
      nav,
    }

    for (const client of this.clients.values()) {
      if (client.subscriptions.has('heartbeat')) {
        this.send(client.socket, heartbeat)
      }
    }
  }

  broadcastTrade(trade: any) {
    for (const client of this.clients.values()) {
      if (client.subscriptions.has('trades')) {
        this.send(client.socket, { type: 'trade', ...trade })
      }
    }
  }

  stop() {
    clearInterval(this.heartbeatInterval)
  }
}

export const wsManager = new WSManager()
