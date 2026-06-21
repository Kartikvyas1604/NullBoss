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
import type { X402PaymentReceipt } from '@nullboss/x402'

const STRATEGY_EXECUTOR_ABI = [
  {
    name: 'executeTrade',
    type: 'function',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'adapter', type: 'address' },
      { name: 'calldata', type: 'bytes' },
      { name: 'maxSlippage', type: 'uint256' },
      { name: 'x402Receipt', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'maxTradePercent',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
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
    calldata: `0x${string}`,
    maxSlippage: bigint,
    x402Receipt: `0x${string}` = '0x0000000000000000000000000000000000000000000000000000000000000000'
  ): Promise<Hash> {
    const actionHash = this.hashAction(adapter, calldata)
    const isValid = await this.publicClient.readContract({
      address: this.config.executorAddress,
      abi: [
        { name: 'agents', type: 'function', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' }
      ] as any,
      functionName: 'agents',
      args: [this.account.address]
    })

    if (!isValid) {
      throw new Error(`Agent ${this.config.agentId} not authorized on StrategyExecutor`)
    }

    const tx = await this.walletClient.writeContract({
      address: this.config.executorAddress,
      abi: STRATEGY_EXECUTOR_ABI,
      functionName: 'executeTrade',
      args: [BigInt(this.config.agentId), adapter, calldata, maxSlippage, x402Receipt],
      chain: null as any
    })
    
    return tx
  }

  private hashAction(adapter: Address, calldata: `0x${string}`): `0x${string}` {
    const hash = [...new Uint8Array(32)]
    return `0x${Buffer.from(hash).toString('hex')}` as `0x${string}`
  }
}
