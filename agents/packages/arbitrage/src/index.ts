import 'dotenv/config'
import { ArbitrageAgent } from './arbitrage-agent'
import type { AgentConfig } from '@nullboss/core'
export { ArbitrageAgent }

async function main() {
  const config: AgentConfig = {
    agentId: parseInt(process.env.AGENT_ID || '2'),
    agentType: 'ARBITRAGE',
    privateKey: process.env.AGENT_PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: parseInt(process.env.CHAIN_ID || '43113'),
    registryAddress: process.env.REGISTRY_ADDRESS as `0x${string}`,
    executorAddress: process.env.EXECUTOR_ADDRESS as `0x${string}`,
    vaultAddress: process.env.VAULT_ADDRESS as `0x${string}`,
    x402Config: {
      privateKey: process.env.X402_PRIVATE_KEY as `0x${string}`,
      maxDailyAllowance: BigInt(process.env.MAX_DAILY_X402 || '10000000000000000000')
    }
  }

  const agent = new ArbitrageAgent(config)
  await agent.start()
}

main().catch(console.error)
