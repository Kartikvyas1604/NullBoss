# NULLBOSS Protocol — Anchored Summary

## Goal
- Fix all mock/predefined data across the entire NULLBOSS protocol app on Avalanche Fuji — replace with real on-chain reads or properly-acknowledged simulation.

## Constraints & Preferences
- Fuji testnet (chain ID 43113), contracts already deployed at known addresses.
- Agent runtime uses same private key for all agents (development-only).
- No additional API keys or external services required.
- Minimal changes to core architecture; fix existing code rather than rewrite.

## Progress

### Done
- **API vault `/deposits` + `/withdrawals`**: Replaced hardcoded `{ deposits: [], total: 0 }` with real `getLogs()` reads of `Deposit`/`Withdraw` events from the deployed FundVault contract.
- **API fees `/breakdown` + `/history`**: Replaced all hardcoded constants with live `FeeRouter` contract reads (`parentPercent`, `subAgentPercent`, `treasuryPercent`, `treasury`, `owner`) and `getLogs` for `ManagementFeeDistributed` / `PerformanceFeeDistributed` events.
- **API agents confidence + reputation**: Removed hardcoded `confidence: 0` and `totalPnl: '0'`. Now calculates `confidence = successRate * 100` from on-chain `getReputation(agentId)` which returns `(totalTrades, successfulTrades)`. Added `successfulTrades` field to response. Removed `totalPnl` (not stored on chain).
- **API trades PnL**: Replaced `pnl: '0'` with calculated `pnl = amountOut - amountIn` for same-token trades. Status now reflects `'SETTLED'` (pnl >= 0) or `'LOSS'` (pnl < 0) instead of always `'SETTLED'`.
- **WebSocket manager**: Removed all `Math.random()` heartbeat data. Now reads real vault state (`totalAssets`, `totalSupply`, share price) and agent reputation on each 10s interval via viem `createPublicClient`.
- **API privacy endpoints**: Check `PRIVACY_COMMIT_REVEAL_ADDRESS` — if zero address (not deployed on Fuji), return 501 with `"not deployed"` error instead of pretending it works.
- **Agent arbitrage price source**: Removed `Math.random()` fake prices. Now reads real AVAX/USD price from the Chainlink oracle at `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD` (same feed MockTradeAdapter uses). Artificial spread is simulated ±1% around the real oracle price.
- **Agent trend price source**: Removed random-walk simulated price. Now reads real AVAX/USD price from Chainlink oracle, builds momentum from price history. Volume signal reads `MockTradeAdapter.tradeCount()` for real on-chain activity, falling back to random walk if it fails.
- **Agent liquidation chain pressure**: Added `getChainPressure()` that reads `PositionLedger.getTradeCount()` to measure recent on-chain activity, modulates confidence proportionally. Confidence is `min(90, 50 + pressure * 20)` instead of flat 90.
- **Orchestrator vault TVL**: Reads `FundVault.totalAssets()` from on-chain to determine totalCapital instead of hardcoded `100000 * 10**6`. `getFleetHealth()` is now async and reads `getReputation(agentId)` for each sub-agent's real trade count.
- **Frontend boot check labels**: Fixed `app/lib/contracts.ts` messages — removed misleading "Syncing NAV oracle feed" / "Spawning sub-agents" labels. Now shows accurate error source like "Vault read failed".
- **Agent wallet funded**: Sent 5 USDC (5,000,000 units) from deployer treasury to agent address (`0xB18C4B...`). Approved 5 USDC allowance to `StrategyExecutor` for trade execution.
- **`POSITION_LEDGER_ADDRESS` added** to `agents/.env` (was only in `api/.env`).
- **`FEE_ROUTER_ADDRESS` added** to `api/.env` for fee route contract reads.
- **`dotenv` loading** added to all four agent entry points (`import 'dotenv/config'`) — previously agents silently failed to read any env vars because `tsx` does not auto-load `.env`.
- **Root `dev:agents` / `dev:agents:all` scripts** changed from `pnpm --filter @nullboss/orchestrator dev` (ran from package dir, no env file) to `cd agents && DOTENV_CONFIG_PATH=.env pnpm dev:orchestrator` (runs from `agents/` dir where `.env` file lives).
- **`tsx` installed** in `agents/` workspace node_modules (was missing, causing `sh: tsx: command not found` on all four agents).
- **On-chain trades verified**: PositionLedger trade count grew from 14 → 22 during agent runtime. MockTradeAdapter `tradeCount` is 10. Trades are executing successfully end-to-end.

### In Progress
- *(none)*

### Blocked
- **PrivacyCommitReveal contract is `0x0000...0000`** (not deployed) — privacy endpoints remain stubs, returning 501 when invoked.
- **No Aave or GMX on Fuji testnet** — liquidation agent still generates synthetic position data (`scanAave`/`scanGMX` return mock undercollateralized positions every 3–5 cycles). Cannot wire to real protocols.
- **StrategyExecutor `getTotalValue()` returns 0** — PositionLedger stores `_positions[address]` by adapter but `getTotalValue()` reads `_positions[address(0)]` which is never set. Circuit breaker (`_checkCircuitBreakers`) is effectively bypassed, allowing trades of any size.
- **Pair-liquidation integration** (synchronous "flip" trade from arbitrage → liquidation) not implemented — no on-chain trigger between agents.

## Key Decisions
- **Keep simulated price spread in arbitrage agent** — both "DEXes" are the same MockTradeAdapter contract. Real spread detection requires two real DEXes. Instead, read real Chainlink oracle price then apply simulated ±1% variance per "DEX" to generate realistic spreads.
- **Keep mock position generation in liquidation agent** — Aave and GMX do not have Fuji testnet deployments. The agent's `scanAave()` / `scanGMX()` cycle through hardcoded positions with synthetic health factors. This is documented in the code as `// on testnet: simulating, no real Aave/GMX`.
- **Keep same private key for all agents** — all four agents sign as `0xB18C4B...` but pass different agent IDs. StrategyExecutor only checks `isAgentActive(agentId)`, not `msg.sender === agentOwner`.
- **Use JSON ABI format instead of `parseAbi()`** — viem's `parseAbi` does not handle `tuple(...)` return types in human-readable form.
- **Hardcoded token addresses in agent source files** — USDC (`0x542589...`), WAVAX (`0x659b28...`), MOCK_ADAPTER (`0x14da13...`), PRICE_FEED (`0x5498BB...`) remain hardcoded in each agent because there is no shared config package that is available to the agent runtime without adding a dependency.

## Remaining On-Chain Data Gaps (API)
| API Route | What It Reads | Source | Status |
|-----------|--------------|--------|--------|
| `GET /vault` | totalAssets, totalSupply | FundVault contract | ✅ Live |
| `GET /vault/deposits` | Deposit events (getLogs) | FundVault contract | ✅ Live |
| `GET /vault/withdrawals` | Withdraw events (getLogs) | FundVault contract | ✅ Live |
| `GET /fees/breakdown` | parentPercent, subAgentPercent, treasuryPercent | FeeRouter contract | ✅ Live |
| `GET /fees/history` | ManagementFeeDistributed / PerformanceFeeDistributed events | FeeRouter contract | ✅ Live |
| `GET /agents` | isAgentActive, getReputation | AgentRegistry contract | ✅ Live |
| `GET /trades` | tradeCount, getTrade (positions array, amountIn, amountOut) | PositionLedger contract | ✅ Live |
| `GET /privacy/...` | Contract existence check | PrivacyCommitReveal | ⛔ Not deployed |
| `WS /ws` | totalAssets, totalSupply, reputation, share price | FundVault + AgentRegistry | ✅ Live |

## Next Steps
1. **Production fix**: Wire `PositionLedger.getTotalValue()` to sum across all adapter positions (not just `address(0)`).
2. **Production fix**: Deploy `PrivacyCommitReveal` and `ShieldedBalance` contracts, then wire API privacy endpoints to them.
3. **Monitoring**: Start API + agents + frontend simultaneously, verify live dashboard shows real PnL and agent confidence moving.
4. **Scale**: Mint more USDC to agent wallet (currently 5 USDC) for higher trade volumes and more frequent arbitrage executions.

## Critical Context
- **Vault holds** 10 USDC (10,000,000 assets), ~10 NBIS shares (10,000,057,999,990,000,000 supply), share price ≈ $1.00.
- **FeeRouter** split: parent 4000 bps (40%), sub-agent 3000 bps (30%), treasury 3000 bps (30%).
- **AgentReputation**: Agent 1 (orchestrator) has 0 trades, agent 2 (arbitrage) has 3 trades (3 successful), agents 3–4 have 0.
- **MockTradeAdapter** has 3.5 USDC and ~500,000 WAVAX. Chainlink price feed returns ~$6.30 per AVAX.
- **Public Fuji RPC** (`https://api.avax-test.network/ext/bc/C/rpc`) may be rate-limited — if frontend reads fail, provide an Alchemy/Infura Fuji RPC endpoint.
- **API tsconfig errors** about missing `composite: true` in referenced packages are pre-existing and do not affect runtime (`tsx` ignores these).

## Relevant Files
- **api/src/routes/vault.ts**: Vault state + events (deposit/withdraw logs via `getLogs`)
- **api/src/routes/fees.ts**: FeeRouter on-chain reads (split percentages, events)
- **api/src/routes/agents.ts**: AgentRegisty + reputation (real confidence from trade counts)
- **api/src/routes/trades.ts**: PositionLedger + PnL (calculated from amountIn/amountOut)
- **api/src/ws/manager.ts**: Real-time heartbeat (contract reads instead of Math.random)
- **api/src/routes/privacy.ts**: Privacy contract status (501 if not deployed)
- **api/src/index.ts**: Entry point (added `import 'dotenv/config'`)
- **api/.env**: Added `FEE_ROUTER_ADDRESS`
- **app/lib/contracts.ts**: Boot check labels (removed misleading messages)
- **agents/package.json**: Scripts (`DOTENV_CONFIG_PATH=.env`, per-agent AGENT_ID)
- **agents/.env**: Shared agent config (added POSITION_LEDGER_ADDRESS)
- **agents/packages/*/src/index.ts**: All 4 entry points (added `import 'dotenv/config'`)
- **agents/packages/arbitrage/src/arbitrage-agent.ts**: Uses Chainlink price feed (`0x5498BB...`) for base price
- **agents/packages/trend/src/trend-agent.ts**: Reads Chainlink price feed for price momentum, MockTradeAdapter for volume signal, fallback random walk on failure
- **agents/packages/liquidation/src/liquidation-agent.ts**: Mock Aave/GMX positions on 3–5 cycle interval, confidence modulated by on-chain PositionLedger trade count
- **agents/packages/orchestrator/src/orchestrator-agent.ts**: Reads vault totalAssets for totalCapital, async getFleetHealth reads on-chain agent reputation
- **contracts/src/adapters/MockTradeAdapter.sol**: Dummy DEX deployed at `0x14da13...`, uses Chainlink price feed
- **contracts/src/mocks/MockWAVAX.sol**: Unrestricted mint ERC20 deployed at `0x659b28...`
