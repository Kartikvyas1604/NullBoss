import {
  createWalletClient,
  createPublicClient,
  http,
  type Hash,
  type Address,
  type PrivateKeyAccount
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { AgentConfig, HealthStatus } from './types'
import type { X402PaymentReceipt } from '@nullboss/x402'

export abstract class BaseAgent {
  protected config: AgentConfig
  protected account: PrivateKeyAccount
  protected walletClient
  protected publicClient
  protected startTime: number
  protected lastAction: number = 0
  protected tradesToday: number = 0
  protected pnlToday: bigint = 0n
  protected running: boolean = false
  protected paused: boolean = false

  constructor(config: AgentConfig) {
    this.config = config
    this.account = privateKeyToAccount(config.privateKey)
    this.startTime = Date.now()
    
    this.walletClient = createWalletClient({
      account: this.account,
      chain: this.getChain(),
      transport: http(config.rpcUrl)
    })
    
    this.publicClient = createPublicClient({
      chain: this.getChain(),
      transport: http(config.rpcUrl)
    })
  }

  protected abstract getChain(): any
  abstract get type(): string
  abstract get confidence(): number
  protected abstract analyze(): Promise<void>
  protected abstract execute(): Promise<void>

  async start(): Promise<void> {
    this.running = true
    console.log(`[${this.config.agentType}] Agent ${this.config.agentId} starting`)
    await this.runLoop()
  }

  stop(): void {
    this.running = false
    console.log(`[${this.config.agentType}] Agent ${this.config.agentId} stopped`)
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      if (!this.paused) {
        try {
          await this.analyze()
          await this.execute()
          this.lastAction = Date.now()
        } catch (error) {
          console.error(`[${this.config.agentType}] Error:`, error)
        }
      }
      await this.sleep(this.getInterval())
    }
  }

  protected abstract getInterval(): number

  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async validateAction(actionHash: `0x${string}`): Promise<boolean> {
    const registryAbi = [
      {
        name: 'validateAgentAction',
        type: 'function',
        inputs: [
          { name: 'agentId', type: 'uint256' },
          { name: 'actionHash', type: 'bytes32' }
        ],
        outputs: [{ name: '', type: 'bool' }],
        stateMutability: 'view'
      }
    ] as const

    try {
      const result = await this.publicClient.readContract({
        address: this.config.registryAddress,
        abi: registryAbi,
        functionName: 'validateAgentAction',
        args: [BigInt(this.config.agentId), actionHash]
      })
      return result
    } catch {
      return false
    }
  }

  getHealth(): HealthStatus {
    return {
      agentId: this.config.agentId,
      agentType: this.type,
      status: this.paused ? 'paused' : this.running ? 'running' : 'error',
      uptime: Date.now() - this.startTime,
      lastAction: this.lastAction,
      lastHeartbeat: Date.now(),
      tradesToday: this.tradesToday,
      pnlToday: this.pnlToday,
      confidence: this.confidence
    }
  }

  async signMessage(message: string): Promise<`0x${string}`> {
    return this.account.signMessage({ message })
  }

  getAddress(): Address {
    return this.account.address
  }
}
