export { OrchestratorAgent } from './orchestrator-agent'
export type { HealthStatus } from '@nullboss/core'

async function main() {
  const config: AgentConfig = {
    agentId: parseInt(process.env.AGENT_ID || '1'),
    agentType: 'ORCHESTRATOR',
    privateKey: process.env.ORCHESTRATOR_PRIVATE_KEY as `0x${string}`,
    rpcUrl: process.env.RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: parseInt(process.env.CHAIN_ID || '43113'),
    registryAddress: process.env.REGISTRY_ADDRESS as `0x${string}`,
    executorAddress: process.env.EXECUTOR_ADDRESS as `0x${string}`,
    vaultAddress: process.env.VAULT_ADDRESS as `0x${string}`,
    x402Config: {
      privateKey: process.env.X402_PRIVATE_KEY as `0x${string}`,
      maxDailyAllowance: BigInt(process.env.MAX_DAILY_X402 || '1000000000000000000')
    }
  }

  const agent = new OrchestratorAgent(config)

  if (process.env.ARBITRAGE_AGENT_ID && process.env.ARBITRAGE_ADDRESS) {
    await agent.registerSubAgent(
      parseInt(process.env.ARBITRAGE_AGENT_ID),
      'ARBITRAGE',
      process.env.ARBITRAGE_ADDRESS
    )
  }
  if (process.env.TREND_AGENT_ID && process.env.TREND_ADDRESS) {
    await agent.registerSubAgent(
      parseInt(process.env.TREND_AGENT_ID),
      'TREND',
      process.env.TREND_ADDRESS
    )
  }
  if (process.env.LIQUIDATION_AGENT_ID && process.env.LIQUIDATION_ADDRESS) {
    await agent.registerSubAgent(
      parseInt(process.env.LIQUIDATION_AGENT_ID),
      'LIQUIDATION',
      process.env.LIQUIDATION_ADDRESS
    )
  }

  await agent.start()
}

main().catch(console.error)
