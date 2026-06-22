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

    const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65' as const
    const MOCK_ADAPTER = '0x14da13F038Def7E6257e5dCB3EdEbABea37367AC' as const
    const TRADE_AMOUNT = BigInt(500000)

    const allowance = await this.publicClient.readContract({
      address: USDC,
      abi: [{ name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }],
      functionName: 'allowance',
      args: [this.account.address, this.config.executorAddress],
    }) as bigint
    if (allowance < TRADE_AMOUNT) {
      const hash = await this.walletClient.writeContract({
        address: USDC,
        abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }],
        functionName: 'approve',
        args: [this.config.executorAddress, TRADE_AMOUNT * 100n],
        chain: null as any,
      })
      console.log(`[Trend] Approved executor, tx: ${hash}`)
    }

    const data = '0x' as `0x${string}`
    const txHash = await this.executorClient.executeTradeWithTokenIn(
      MOCK_ADAPTER,
      USDC,
      TRADE_AMOUNT,
      data,
      100n,
      TRADE_AMOUNT,
    )
    console.log(`[Trend] Trade executed: ${txHash}`)
    this.tradesToday++
    this.currentConfidence = 0
  }
}
