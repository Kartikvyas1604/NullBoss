import {
  createWalletClient,
  createPublicClient,
  http,
  type Hash,
  type Address,
  type PrivateKeyAccount
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { AgentConfig } from './types'

const STRATEGY_EXECUTOR_ABI = [
  {
    name: 'executeTrade',
    type: 'function',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'adapter', type: 'address' },
      { name: 'data', type: 'bytes' },
      { name: 'maxSlippageBps', type: 'uint256' },
      { name: 'expectedMinAmountOut', type: 'uint256' },
      { name: 'x402Receipt', type: 'bytes32' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'executeTradeWithTokenIn',
    type: 'function',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'adapter', type: 'address' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      { name: 'maxSlippageBps', type: 'uint256' },
      { name: 'expectedMinAmountOut', type: 'uint256' },
      { name: 'x402Receipt', type: 'bytes32' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
    stateMutability: 'nonpayable'
  }
] as const

export class StrategyExecutorClient {
  private walletClient
  private publicClient
  private account: PrivateKeyAccount
  private config: AgentConfig

  constructor(config: AgentConfig) {
    this.config = config
    this.account = privateKeyToAccount(config.privateKey)

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

  private getChain(): any {
    return { id: this.config.chainId, name: 'Avalanche', nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 }, rpcUrls: { default: { http: [this.config.rpcUrl] } } }
  }

  async executeTrade(
    adapter: Address,
    data: `0x${string}`,
    maxSlippageBps: bigint,
    expectedMinAmountOut: bigint,
    x402Receipt: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<Hash> {
    const tx = await this.walletClient.writeContract({
      address: this.config.executorAddress,
      abi: STRATEGY_EXECUTOR_ABI,
      functionName: 'executeTrade',
      args: [BigInt(this.config.agentId), adapter, data, maxSlippageBps, expectedMinAmountOut, x402Receipt],
      chain: null as any
    })

    return tx
  }

  async executeTradeWithTokenIn(
    adapter: Address,
    tokenIn: Address,
    amountIn: bigint,
    data: `0x${string}`,
    maxSlippageBps: bigint,
    expectedMinAmountOut: bigint,
    x402Receipt: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<Hash> {
    const tx = await this.walletClient.writeContract({
      address: this.config.executorAddress,
      abi: STRATEGY_EXECUTOR_ABI,
      functionName: 'executeTradeWithTokenIn',
      args: [BigInt(this.config.agentId), adapter, tokenIn, amountIn, data, maxSlippageBps, expectedMinAmountOut, x402Receipt],
      chain: null as any
    })

    return tx
  }
}
