import type { WebSocketHandler } from 'bun'

interface WSClient {
  id: string
  socket: WebSocket
  subscriptions: Set<string>
}

class WSManager {
  private clients: Map<string, WSClient> = new Map()
  private heartbeatInterval: Timer

  constructor() {
    this.heartbeatInterval = setInterval(() => this.broadcastHeartbeat(), 10000)
  }

  getWebSocketHandler(): WebSocketHandler {
    return {
      open: (ws) => {
        const id = `client_${Date.now()}_${Math.random().toString(36).slice(2)}`
        this.clients.set(id, { id, socket: ws as any, subscriptions: new Set(['heartbeat']) })
        this.send(ws, { type: 'connected', clientId: id })
      },
      message: (ws, message) => {
        try {
          const data = JSON.parse(message.toString())
          this.handleMessage(ws as any, data)
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

  private handleMessage(socket: WebSocket, data: any) {
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

  private send(ws: WebSocket, data: any) {
    try { ws.send(JSON.stringify(data)) } catch { /* drop */ }
  }

  broadcastHeartbeat() {
    const heartbeat = {
      type: 'heartbeat',
      timestamp: Date.now(),
      agents: {
        arbitrage: { status: 'running', confidence: Math.floor(Math.random() * 40) + 60 },
        trend: { status: 'running', confidence: Math.floor(Math.random() * 30) + 70 },
        liquidation: { status: Math.random() > 0.7 ? 'running' : 'idle', confidence: Math.floor(Math.random() * 50) + 30 },
        orchestrator: { status: 'running', confidence: 92 }
      },
      nav: {
        sharePrice: (125 + Math.random() * 2).toFixed(2),
        totalAssets: (4500000 + Math.random() * 10000).toFixed(2),
        dailyPnl: (Math.random() > 0.5 ? '' : '-') + (Math.random() * 5000).toFixed(2)
      }
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
