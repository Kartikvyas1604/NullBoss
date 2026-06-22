import { BaseAgent } from '@nullboss/core'
import type { AgentConfig } from '@nullboss/core'
import { encodeAbiParameters, parseAbiParameters } from 'viem'

const MOCK_ADAPTER = '0xeE99F15E026E75FF7A215ea01f512f55d8CC1880'
const USDC = '0x5425890298aed601595a70AB815c96711a31Bc65'
const MAX_SLIPPAGE = 100n
const TRADE_AMOUNT = BigInt(1) * BigInt(10**6)

export class ArbitrageAgent extends BaseAgent {
  private dexPairs: Map<string, { dexA: string, dexB: string, pair: string }> = new Map()
  private currentConfidence: number = 0
  private readonly MIN_PROFIT_BPS = 50n
  private approved = false

  constructor(config: AgentConfig) {
    super(config)
    this.initializePairs()
  }

  private initializePairs() {
    this.dexPairs.set('AVAX-USDC', {
      dexA: '0xTraderJoeAVAXUSDC',
      dexB: '0xPangolinAVAXUSDC',
      pair: '0xAVAXUSDC'
    })
    this.dexPairs.set('BTC.b-USDC', {
      dexA: '0xTraderJoeBTCUSDC',
      dexB: '0xPangolinBTCUSDC',
      pair: '0xBTCUSDC'
    })
  }

  get type(): string { return 'ARBITRAGE' }
  get confidence(): number { return this.currentConfidence }

  protected getInterval(): number {
    return 12000
  }

  protected getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  protected async analyze(): Promise<void> {
    console.log(`[Arbitrage] Scanning ${this.dexPairs.size} pairs for arbitrage opportunities`)
    
    for (const [pairName, pair] of this.dexPairs) {
      try {
        const priceA = await this.getPrice()
        const priceB = await this.getPrice()
        
        if (priceA === 0n || priceB === 0n) continue
        
        const diff = priceA > priceB ? priceA - priceB : priceB - priceA
        const basisPoints = (diff * 10000n) / ((priceA + priceB) / 2n)
        
        if (basisPoints >= this.MIN_PROFIT_BPS) {
          this.currentConfidence = Math.min(95, Number(basisPoints) / 2)
          console.log(`[Arbitrage] Opportunity on ${pairName}: ${basisPoints} bps spread`)
        }
      } catch (error) {
        console.error(`[Arbitrage] Error scanning ${pairName}:`, error)
      }
    }
    
    if (this.currentConfidence < 10) {
      this.currentConfidence = Math.max(0, this.currentConfidence - 5)
    }
  }

  private async getPrice(): Promise<bigint> {
    const basePrice = BigInt(25000000)
    const variance = BigInt(Math.floor(Math.random() * 200000) - 100000)
    return basePrice + variance
  }

  protected async execute(): Promise<void> {
    if (this.currentConfidence < 70) {
      return
    }

    try {
      if (!this.approved) {
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
          console.log(`[Arbitrage] Approved executor, tx: ${hash}`)
        }
        this.approved = true
      }

      const data = encodeAbiParameters(parseAbiParameters('uint256'), [TRADE_AMOUNT])
      const expectedOut = TRADE_AMOUNT

      const tx = await this.executorClient.executeTradeWithTokenIn(
        MOCK_ADAPTER,
        USDC,
        TRADE_AMOUNT,
        data,
        MAX_SLIPPAGE,
        expectedOut,
      )

      console.log(`[Arbitrage] Trade executed: ${tx}`)
      this.tradesToday++
      this.pnlToday += 0n
    } catch (error) {
      console.error(`[Arbitrage] Trade execution failed:`, error)
    }

    this.currentConfidence = 0
  }
}
