import { createPublicClient, http } from 'viem'
import { avalanche, avalancheFuji } from 'viem/chains'

const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 43113)
const chain = CHAIN_ID === 43114 ? avalanche : avalancheFuji
const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (CHAIN_ID === 43114
    ? 'https://api.avax.network/ext/bc/C/rpc'
    : 'https://api.avax-test.network/ext/bc/C/rpc')

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) })

export const CHAIN_NAMES: Record<number, string> = {
  43114: 'Avalanche C-Chain',
  43113: 'Avalanche Fuji Testnet',
}

export const CONTRACT_ADDRESSES = {
  vault: process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` | undefined,
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS as `0x${string}` | undefined,
  executor: process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS as `0x${string}` | undefined,
  feeRouter: process.env.NEXT_PUBLIC_FEE_ROUTER_ADDRESS as `0x${string}` | undefined,
  positionLedger: process.env.NEXT_PUBLIC_POSITION_LEDGER_ADDRESS as `0x${string}` | undefined,
  agentWallet: process.env.NEXT_PUBLIC_AGENT_WALLET_ADDRESS as `0x${string}` | undefined,
}

export function isDeployed(address: `0x${string}` | undefined): address is `0x${string}` {
  return !!address && address !== '0x...' && address.startsWith('0x') && address.length === 42
}

export interface BootCheckResult {
  label: string
  ok: boolean
  error?: string
  latency?: number
}

export const VAULT_ABI = [
  {
    type: 'function' as const,
    name: 'totalAssets',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'highWaterMark',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'paused',
    inputs: [],
    outputs: [{ type: 'bool' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'asset',
    inputs: [],
    outputs: [{ type: 'address' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'deposit',
    inputs: [
      { type: 'uint256' as const, name: 'assets' },
      { type: 'address' as const, name: 'receiver' },
    ],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'redeem',
    inputs: [
      { type: 'uint256' as const, name: 'shares' },
      { type: 'address' as const, name: 'receiver' },
      { type: 'address' as const, name: 'owner' },
    ],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'maxDeposit',
    inputs: [{ type: 'address' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'maxRedeem',
    inputs: [{ type: 'address' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'previewDeposit',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'previewRedeem',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'balanceOf',
    inputs: [{ type: 'address' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
] as const

export const ERC20_ABI = [
  {
    type: 'function' as const,
    name: 'approve',
    inputs: [
      { type: 'address' as const, name: 'spender' },
      { type: 'uint256' as const, name: 'amount' },
    ],
    outputs: [{ type: 'bool' as const }],
    stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const,
    name: 'allowance',
    inputs: [
      { type: 'address' as const, name: 'owner' },
      { type: 'address' as const, name: 'spender' },
    ],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'balanceOf',
    inputs: [{ type: 'address' as const }],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' as const }],
    stateMutability: 'view' as const,
  },
] as const

export const REGISTRY_ABI = [
  {
    type: 'function' as const,
    name: 'getAgent',
    inputs: [{ type: 'uint256' as const }],
    outputs: [
      {
        type: 'tuple' as const,
        components: [
          { type: 'uint256' as const, name: 'agentId' },
          { type: 'address' as const, name: 'owner' },
          { type: 'uint256' as const, name: 'parentAgentId' },
          { type: 'string' as const, name: 'metadataUri' },
          { type: 'bool' as const, name: 'registered' },
          { type: 'uint256' as const, name: 'revokedAt' },
        ],
      },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'isAgentActive',
    inputs: [{ type: 'uint256' as const }],
    outputs: [{ type: 'bool' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getReputation',
    inputs: [{ type: 'uint256' as const }],
    outputs: [
      { type: 'uint256' as const, name: 'successCount' },
      { type: 'uint256' as const, name: 'totalCount' },
    ],
    stateMutability: 'view' as const,
  },
] as const

export const LEDGER_ABI = [
  {
    type: 'function' as const,
    name: 'getTradeCount',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getTrade',
    inputs: [{ type: 'uint256' as const }],
    outputs: [
      {
        type: 'tuple' as const,
        components: [
          { type: 'bytes32' as const, name: 'tradeId' },
          { type: 'uint256' as const, name: 'agentId' },
          { type: 'address' as const, name: 'tokenIn' },
          { type: 'address' as const, name: 'tokenOut' },
          { type: 'uint256' as const, name: 'amountIn' },
          { type: 'uint256' as const, name: 'amountOut' },
          { type: 'uint256' as const, name: 'fee' },
          { type: 'bytes32' as const, name: 'x402Receipt' },
          { type: 'uint256' as const, name: 'timestamp' },
        ],
      },
    ],
    stateMutability: 'view' as const,
  },
  {
    type: 'function' as const,
    name: 'getTotalValue',
    inputs: [],
    outputs: [{ type: 'uint256' as const }],
    stateMutability: 'view' as const,
  },
] as const

export async function checkChainConnection(): Promise<BootCheckResult> {
  const start = performance.now()
  try {
    const chainId = await publicClient.getChainId()
    const latency = Math.round(performance.now() - start)
    if (chainId !== CHAIN_ID) {
      return { label: 'Chain ID mismatch', ok: false, error: `Expected ${CHAIN_ID}, got ${chainId}`, latency }
    }
    return { label: `Connected to ${CHAIN_NAMES[chainId] || `Chain ${chainId}`}`, ok: true, latency }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    return { label: 'On-chain connection', ok: false, error: err instanceof Error ? err.message : 'Connection failed', latency }
  }
}

export async function checkVault(): Promise<BootCheckResult> {
  const start = performance.now()
  const vaultAddr = CONTRACT_ADDRESSES.vault
  if (!isDeployed(vaultAddr)) {
    return { label: 'FundVault not yet deployed', ok: false, error: 'VAULT_ADDRESS not set', latency: 0 }
  }
  try {
    const totalAssets = await publicClient.readContract({
      address: vaultAddr,
      abi: VAULT_ABI,
      functionName: 'totalAssets',
    })
    const totalSupply = await publicClient.readContract({
      address: vaultAddr,
      abi: VAULT_ABI,
      functionName: 'totalSupply',
    })
    const latency = Math.round(performance.now() - start)
    const label = `Vault: ${formatUnits(totalAssets as bigint, 6)} USDC · ${formatUnits(totalSupply as bigint, 18)} shares`
    return { label, ok: true, latency }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    return { label: 'Vault read failed', ok: false, error: err instanceof Error ? err.message : 'Vault read failed', latency }
  }
}

export async function checkRegistry(): Promise<BootCheckResult> {
  const start = performance.now()
  const registryAddr = CONTRACT_ADDRESSES.registry
  if (!isDeployed(registryAddr)) {
    return { label: 'AgentRegistry not yet deployed', ok: false, error: 'REGISTRY_ADDRESS not set', latency: 0 }
  }
  try {
    let agentCount = 0
    for (let i = 1; i <= 10; i++) {
      try {
        const agent = await publicClient.readContract({
          address: registryAddr,
          abi: REGISTRY_ABI,
          functionName: 'getAgent',
          args: [BigInt(i)],
        })
        const a = agent as { registered: boolean }
        if (a.registered) agentCount++
      } catch {
        break
      }
    }
    const latency = Math.round(performance.now() - start)
    const label = agentCount > 0
      ? `Registered agents: ${agentCount}`
      : 'No agents registered yet'
    return { label, ok: true, latency }
  } catch (err) {
    const latency = Math.round(performance.now() - start)
    return { label: 'Registry read failed', ok: false, error: err instanceof Error ? err.message : 'Registry read failed', latency }
  }
}

export async function checkFundIsLive(): Promise<BootCheckResult> {
  const vaultAddr = CONTRACT_ADDRESSES.vault
  if (!isDeployed(vaultAddr)) {
    return { label: 'Fund is not yet deployed', ok: false, error: 'VAULT_ADDRESS not set' }
  }
  try {
    const paused = await publicClient.readContract({
      address: vaultAddr,
      abi: VAULT_ABI,
      functionName: 'paused',
    })
    if (paused) {
      return { label: 'Fund is paused', ok: false, error: 'Vault contract is paused' }
    }
    return { label: 'Fund is live. No human in the loop.', ok: true }
  } catch (err) {
    return { label: 'Fund status check', ok: false, error: err instanceof Error ? err.message : 'Status check failed' }
  }
}

function formatUnits(value: bigint, decimals: number): string {
  const divisor = BigInt(10) ** BigInt(decimals)
  const whole = value / divisor
  const fraction = value % divisor
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 2)
  return `${whole}.${fractionStr}`
}
