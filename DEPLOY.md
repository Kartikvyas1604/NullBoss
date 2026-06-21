# NULLBOSS Protocol Deployment Guide

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js 20+
- pnpm 9+
- Avalanche wallet with test AVAX (Fuji) or AVAX (mainnet)

## Smart Contract Deployment

### 1. Install dependencies

```bash
cd contracts
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install OpenZeppelin/openzeppelin-contracts-upgradeable --no-commit
forge install foundry-rs/forge-std --no-commit
```

### 2. Configure environment

```bash
cp contracts/.env.example contracts/.env
# Edit .env with your keys
```

### 3. Run tests

```bash
forge test -vvv
```

### 4. Deploy to Fuji testnet

```bash
# Deploy all contracts
forge script script/Deploy.s.sol --rpc-url https://api.avax-test.network/ext/bc/C/rpc --broadcast --verify -vvv
```

### 5. Verify on Snowtrace

Contracts are verified automatically with `--verify`. If verification fails:

```bash
forge verify-contract <CONTRACT_ADDRESS> src/FundVault.sol:FundVault --chain-id 43113
forge verify-contract <CONTRACT_ADDRESS> src/AgentRegistry.sol:AgentRegistry --chain-id 43113
forge verify-contract <CONTRACT_ADDRESS> src/FeeRouter.sol:FeeRouter --chain-id 43113
forge verify-contract <CONTRACT_ADDRESS> src/StrategyExecutor.sol:StrategyExecutor --chain-id 43113
forge verify-contract <CONTRACT_ADDRESS> src/PositionLedger.sol:PositionLedger --chain-id 43113
```

### 6. Deploy to Mainnet

```bash
forge script script/Deploy.s.sol --rpc-url https://api.avax.network/ext/bc/C/rpc --broadcast --verify -vvv
```

## Post-Deployment Configuration

### FundVault
1. Set PositionLedger address
2. Set FeeRouter address  
3. Set EMERGENCY_GUARDIAN role
4. Set timelock parameters

### AgentRegistry
1. Register Orchestrator agent (agentId = 1)
2. Register sub-agents (agentId = 2, 3, 4) with parentAgentId = 1

### StrategyExecutor
1. Whitelist adapters (Trader Joe, Pangolin, Aave, GMX)
2. Set circuit breaker parameters
3. Authorize agent addresses

### FeeRouter
1. Set fee splits
2. Set treasury address

## Agent Runtime Setup

### 1. Configure agents

```bash
cp agents/.env.example agents/.env
# Edit with deployed contract addresses and agent keys
```

### 2. Start agents

```bash
# Start orchestrator (manages all sub-agents)
pnpm --filter @nullboss/orchestrator dev

# Start individual agents (if running standalone)
pnpm --filter @nullboss/arbitrage dev
pnpm --filter @nullboss/trend dev
pnpm --filter @nullboss/liquidation dev
```

## API Server

```bash
cp api/.env.example api/.env
pnpm --filter @nullboss/api dev
```

The API runs on port 3001. The WebSocket endpoint is at `ws://localhost:3001`.

## End-to-End Test Cycle

1. Deploy contracts to Fuji
2. Get test AVAX from [Avalanche Faucet](https://build.avax.network/console/primary-network/faucet)
3. Get test USDC from [Avalanche Bridge Faucet](https://test.core.app/faucet)
4. Deposit USDC into FundVault
5. Register agents in AgentRegistry
6. Authorize agents in StrategyExecutor
7. Run agent runtime
8. Monitor trades via API
9. Harvest fees
10. Withdraw and verify NAV/share price

## Security

### Before Mainnet

- [ ] External audit of FundVault.sol
- [ ] External audit of StrategyExecutor.sol
- [ ] Internal audit of AgentRegistry.sol
- [ ] Internal audit of FeeRouter.sol
- [ ] Test all circuit breakers
- [ ] Verify timelock on EMERGENCY_GUARDIAN
- [ ] Deploy with time-limited test period
- [ ] Set conservative circuit breaker parameters

### Roles

| Role | Function | Trust Assumption |
|------|----------|-----------------|
| EMERGENCY_GUARDIAN | Pause vault (timelocked) | 2-day delay prevents abuse |
| STRATEGY_ROLE | Execute trades | Only registered agents |
| DEFAULT_ADMIN | Configure parameters | Timelocked multi-sig recommended |

## Network Details

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Avalanche C-Chain | 43114 | https://api.avax.network/ext/bc/C/rpc | https://snowtrace.io |
| Avalanche Fuji | 43113 | https://api.avax-test.network/ext/bc/C/rpc | https://testnet.snowtrace.io |
