import { BaseAgent, AgentX402Integration } from '@nullboss/core'
import type { AgentConfig } from '@nullboss/core'

export class TrendAgent extends BaseAgent {
  private currentConfidence: number = 0
  private x402: AgentX402Integration
  private readonly MIN_CONFIDENCE_THRESHOLD = 65
  private readonly TREND_LOOKBACK_BLOCKS = 100
  private priceHistory: bigint[] = []

  constructor(config: AgentConfig) {
    super(config)
    this.x402 = new AgentX402Integration(config.x402Config.privateKey)
  }

  get type(): string { return 'TREND' }
  get confidence(): number { return this.currentConfidence }

  protected getInterval(): number {
    return 30000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  protected async analyze(): Promise<void> {
    const momentum = await this.calculateMomentum()
    const volumeSignal = await this.analyzeVolume()
    let sentimentSignal = 0

    try {
      const sentiment = await this.x402.fetchData('https://api.nullboss.io/v1/sentiment/avalanche')
      sentimentSignal = sentiment.score || 0
    } catch {
      console.log('[Trend] x402 sentiment unavailable, using on-chain data only')
    }

    const compositeScore = momentum * 0.4 + volumeSignal * 0.3 + sentimentSignal * 0.3
    this.currentConfidence = Math.min(99, Math.max(0, compositeScore))
  }

  private async calculateMomentum(): Promise<number> {
    const currentPrice = await this.getAVAXPrice()
    this.priceHistory.push(currentPrice)
    if (this.priceHistory.length > this.TREND_LOOKBACK_BLOCKS) {
      this.priceHistory.shift()
    }
    if (this.priceHistory.length < 10) return 0
    const oldPrice = this.priceHistory[0]
    if (oldPrice === 0n) return 0
    const change = Number((currentPrice - oldPrice) * 10000n / oldPrice)
    return Math.max(-100, Math.min(100, change))
  }

  private async analyzeVolume(): Promise<number> {
    return 50 + Math.floor(Math.random() * 30)
  }

  private async getAVAXPrice(): Promise<bigint> {
    const basePrice = BigInt(25000000)
    const variance = BigInt(Math.floor(Math.random() * 1000000) - 500000)
    return basePrice + variance
  }

  protected async execute(): Promise<void> {
    if (this.currentConfidence < this.MIN_CONFIDENCE_THRESHOLD) {
      console.log('[Trend] Confidence too low, holding')
      return
    }
    const direction = this.currentConfidence > 50 ? 'LONG' : 'SHORT'
    console.log(`[Trend] Executing ${direction} (confidence: ${this.currentConfidence}%)`)

    const balance = await this.walletClient.getBalance({ address: this.config.agentAddress })
    console.log(`[Trend] Agent balance: ${balance}`)

    if (balance < BigInt(1000000)) {
      console.log('[Trend] Insufficient balance, skipping')
      return
    }

    const usdc = this.config.usdcToken
    const adapter = this.config.mockTradeAdapter
    const amountIn = balance / BigInt(2)
    const data = '0x' as `0x${string}`
    const maxSlippageBps = 100n
    const expectedMinAmountOut = amountIn

    await this.executorClient.approveToken(usdc, amountIn)
    const txHash = await this.executorClient.executeTradeWithTokenIn(
      adapter,
      usdc,
      amountIn,
      data,
      maxSlippageBps,
      expectedMinAmountOut,
    )
    console.log(`[Trend] Trade executed: ${txHash}`)
    this.tradesToday++
    this.currentConfidence = 0
  }
}
