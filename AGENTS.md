# NULLBOSS Protocol — Agent Guidelines

## Monorepo Structure

```
avalanch-speedrun/
├── app/              ← Next.js frontend (existing)
├── contracts/        ← Foundry smart contracts
│   ├── src/          ← Solidity source
│   ├── test/         ← Foundry tests (77 passing)
│   └── script/       ← Deploy scripts
├── packages/
│   ├── types/        ← Shared TypeScript types (@nullboss/types)
│   ├── x402/         ← 402 Payment Required protocol (@nullboss/x402)
│   └── config/       ← Shared configs (tsconfig, eslint, prettier)
├── agents/
│   └── packages/
│       ├── core/          ← Base agent runtime
│       ├── orchestrator/  ← Parent orchestrator agent
│       ├── arbitrage/     ← Arbitrage agent
│       ├── trend/         ← Trend-following agent
│       └── liquidation/   ← Liquidation hunter agent
├── api/              ← REST + WebSocket API layer
├── pnpm-workspace.yaml
└── turbo.json
```

## Commands

```bash
pnpm dev              # Start frontend
pnpm dev:api          # Start API server
pnpm dev:agents       # Start orchestrator agent
pnpm build:contracts  # Compile contracts
pnpm test             # Run contract tests
pnpm deploy:fuji      # Deploy to Fuji
```

## Architecture Flow

1. User deposits USDC → FundVault → mints shares
2. AI agents analyze markets → sign actions with ERC-8004 identity
3. Agents pay for data via x402 HTTP 402 auto-payments
4. StrategyExecutor validates agent signature → executes trade
5. PositionLedger records trade + x402 receipt
6. Fees accrue per-block (management) + per-harvest (performance)
7. FeeRouter distributes to parent treasury + sub-agent attribution
8. User withdraws → burns shares → returns USDC + gains

## Shared-First Rule

Before writing logic in any app, check if it belongs in packages/. Never duplicate code.
