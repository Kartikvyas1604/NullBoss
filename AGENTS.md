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

---

## Goal

Replace all mock/predefined data across the NULLBOSS protocol app on Avalanche Fuji with real on-chain reads or properly-acknowledged simulation.

## Constraints & Preferences

- Fuji testnet (chain ID 43113), contracts already deployed at known addresses.
- Agent runtime uses same private key for all agents (development-only).
- No additional API keys or external services required.

## Progress

### Done
- **API vault `/deposits` + `/withdrawals`**: Replaced hardcoded data with real `getLogs()` reads of `Deposit`/`Withdraw` events from FundVault.
- **API fees `/breakdown` + `/history`**: Replaced hardcoded constants with live `FeeRouter` contract reads (`parentPercent`, `subAgentPercent`, `treasuryPercent`) and event logs.
- **API agents confidence + reputation**: Removed hardcoded `confidence: 0` and `totalPnl: '0'`. Confidence = `successRate * 100` from on-chain `getReputation(agentId)`.
- **API trades PnL**: PnL = `amountOut - amountIn` for same-token trades. Status `'SETTLED'` (pnl >= 0) or `'LOSS'` (pnl < 0).
- **WebSocket manager**: Removed `Math.random()` heartbeat. Reads real vault state + agent reputation via viem at 10s intervals.
- **API privacy endpoints**: Returns 501 `"not deployed"` when `PRIVACY_COMMIT_REVEAL_ADDRESS` is zero address.
- **Agent arbitrage price source**: Replaced `Math.random()` fake prices. Reads real AVAX/USD from Chainlink oracle `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`. Simulated ±1% spread around real price.
- **Agent trend price source**: Reads real AVAX/USD from Chainlink oracle for momentum. Volume reads `MockTradeAdapter.tradeCount()` for on-chain activity.
- **Agent liquidation chain pressure**: Reads `PositionLedger.getTradeCount()` for on-chain activity metric. Confidence = `min(90, 50 + pressure * 20)`.
- **Orchestrator vault TVL**: Reads `FundVault.totalAssets()` from on-chain for capital allocation. `getFleetHealth()` now async, reads `getReputation(agentId)`.
- **All four agents**: Added `import 'dotenv/config'` to entry points. `tsx` installed in agents workspace. Scripts run from `agents/` dir where `.env` lives.
- **Agent trade amounts**: All three trading agents now read `USDC.balanceOf(this.account.address)` at runtime and trade 60–80% of available balance instead of hardcoded 1 USDC. StrategyExecutor allowance set to infinite (`2^256-1`) so no re-approval needed.
- **VaultActionModal**: All production-grade — `previewRedeem(shares)` shows real-time USDC estimate, `maxRedeem` validation, correct `[ Withdrawing... ]` label, Snowtrace explorer link on success, human-readable error messages. Deposit flow uses `vault.deposit()` (no longer bypasses to agent wallet).
- **Vault seeded with 18.5 USDC**: Drained MockTradeAdapter's USDC via `drainUsdc()` and deposited to vault. NAV/share = ~$1.00. Total supply = 18.5 shares.
- **Frontend boot check labels**: Fixed `app/lib/contracts.ts` to show accurate error source.
- **`tsconfig.json`**: Target `ES2020`, include `app/**` only. Build passes cleanly.
- **On-chain trades verified**: PositionLedger trade count grew 14 → 22. MockTradeAdapter `tradeCount` = 10. Trades executing end-to-end.

### Blocked
- **Contract admin roles locked**: FundVault and StrategyExecutor `DEFAULT_ADMIN_ROLE` transferred to treasury `0xd5b9Ed9E3c7b72e97fDbe8De818B072901eEB098` during deploy. We do not control this key. Cannot call `sweepToken`, `withdrawToVault`, whitelist adapters, or modify vault config.
- **30.77 WAVAX (~$200) + 7 USDC stuck in StrategyExecutor**: Trade proceeds trapped because only the treasury has admin access.
- **MockTradeAdapter one-way only**: USDC → WAVAX only. No WAVAX → USDC path.
- **PrivacyCommitReveal not deployed** — privacy endpoints return 501.
- **No Aave/GMX on Fuji** — liquidation agent generates synthetic positions.

## Key Decisions

- **Deposit goes to vault**: User USDC → `vault.deposit(amount, user)` → mints shares. Agent wallet no longer sits between user and vault.
- **Agents trade dynamically**: 60–80% of wallet balance per cycle. No hardcoded amounts.
- **Same private key for all agents** — all sign as `0xB18C4B...`. StrategyExecutor only checks `isAgentActive(agentId)`, not `msg.sender === agentOwner`.
- **Simulated spreads in arbitrage** — both "DEXes" are the same MockTradeAdapter.
- **Mock positions in liquidation** — no Aave/GMX on Fuji.
- **Keep existing contracts** — no redeploy planned yet.

## Next Steps

1. **Deposit/withdraw e2e**: User can connect wallet, deposit USDC to vault, see shares, withdraw. Works now with 18.5 USDC vault balance.
2. **Redeploy with admin retention** (future): Deploy new FundVault + StrategyExecutor where `DEFAULT_ADMIN_ROLE` stays with deployer. Add two-way swap to MockTradeAdapter. This recovers the full profit cycle.
3. **Wire vault → agent wallet for trading** (future): Once new contracts are deployed, add backend sweep script: StrategyExecutor proceeds → vault deposit → NAV increases → user withdraws at higher price.

## On-chain State
- **FundVault** (`0xf53AFFb18627a99B7c8e71C3812944BD4e16Ff4b`): **18.5 USDC**, 18.5 shares, NAV ≈ $1.00.
- **StrategyExecutor** (`0xEC3AF849135C5Ec88EC04f74ECf62b1c8dB9869d`): 7 USDC + 30.77 WAVAX (stuck). No accessible admin.
- **MockTradeAdapter** (`0x14da13...`): 0 USDC (drained), 499,969 WAVAX. One-way only.
- **Agent wallet** (`0xB18C4B...`): 0 USDC (all deposited to vault).
- **Chainlink price feed**: `0x5498BB86...`, ~$6.30/AVAX.
- **Treasury** (`0xd5b9Ed9E3c7b72e97fDbe8De818B072901eEB098`): Holds all admin roles — key unknown.

## Relevant Files
- **app/components/VaultActionModal.tsx**: Deposit = `vault.deposit(amount, user)`. Withdraw = `vault.redeem(shares, user, user)`. PreviewRedeem, maxRedeem, error handling.
- **app/dashboard/page.tsx**: Calls `VaultActionModal` with deposit/withdraw. `onSuccess` refetches vault state.
- **app/lib/contracts.ts**: Vault ABI with deposit/redeem/previewRedeem/maxRedeem functions.
- **.env**: `NEXT_PUBLIC_VAULT_ADDRESS`, executor, registry, etc. No agent wallet needed for frontend.
- **tsconfig.json**: Target ES2020, include `app/**` only.
- **agents/packages/arbitrage/src/arbitrage-agent.ts**: Dynamic trade amount (80%). Chainlink price.
- **agents/packages/trend/src/trend-agent.ts**: Dynamic trade amount (60%). Chainlink + adapter volume.
- **agents/packages/liquidation/src/liquidation-agent.ts**: Dynamic trade amount (60%). PositionLedger pressure.
- **agents/packages/orchestrator/src/orchestrator-agent.ts**: Reads vault totalAssets. Async fleet health.
- **api/src/routes/**: All live on-chain reads (vault, fees, agents, trades, privacy).
- **contracts/script/Deploy.s.sol**: Transfers admin to treasury if `treasuryAddress != deployer`.
