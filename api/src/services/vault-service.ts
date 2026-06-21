import { createPublicClient, createWalletClient, http, parseAbi, type Hash } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export class VaultService {
  private publicClient
  private walletClient?
  private vaultAddress: `0x${string}`

  constructor(chainId: number, rpcUrl: string, vaultAddress: `0x${string}`, privateKey?: `0x${string}`) {
    const chain = {
      id: chainId,
      name: 'Avalanche',
      nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } }
    }

    this.publicClient = createPublicClient({ chain, transport: http(rpcUrl) })
    this.vaultAddress = vaultAddress

    if (privateKey) {
      this.walletClient = createWalletClient({
        account: privateKeyToAccount(privateKey),
        chain,
        transport: http(rpcUrl)
      })
    }
  }

  async getTotalAssets(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.vaultAddress,
      abi: parseAbi(['function totalAssets() view returns (uint256)']),
      functionName: 'totalAssets'
    })
  }

  async getSharePrice(): Promise<bigint> {
    const [totalAssets, totalSupply] = await Promise.all([
      this.getTotalAssets(),
      this.publicClient.readContract({
        address: this.vaultAddress,
        abi: parseAbi(['function totalSupply() view returns (uint256)']),
        functionName: 'totalSupply'
      })
    ])
    return totalSupply > 0n ? (totalAssets * BigInt(10 ** 18)) / totalSupply : BigInt(10 ** 18)
  }

  async harvest(agentId: number): Promise<Hash> {
    if (!this.walletClient) throw new Error('Wallet not configured')
    return this.walletClient.writeContract({
      address: this.vaultAddress,
      abi: parseAbi(['function harvest(uint256 agentId)']),
      functionName: 'harvest',
      args: [BigInt(agentId)]
    })
  }
}
