# NULLBOSS Privacy Layer

NULLBOSS implements three privacy mechanisms aligned with Avalanche's L1 sovereignty thesis:

## 1. Commit-Reveal for Strategy Intents

**Purpose:** Prevent front-running and copy-trading of AI signals.

**Flow:**
1. Agent generates trade parameters + random salt
2. Agent submits `commitHash = keccak256(tradeData, salt)` to `PrivacyCommitReveal` contract
3. Trade executes through private mempool
4. Agent reveals `(tradeData, salt)` post-settlement
5. Anyone can verify: `keccak256(revealedTradeData, salt) === commitHash`

**Why not just execute directly?**
Without commit-reveal, validators/bots can observe and front-run AI trades within the same block. The commit proves the AI planned the trade before execution without revealing the parameters.

## 2. Shielded Balances

**Purpose:** Allow large investors (whales) to verify holdings without revealing exact position sizes.

**Mechanism:**
- Users commit to a `balanceCommitment = hash(address, amount, salt)`
- Merkle tree stores all committed balances
- ZK proofs verify "balance >= X" without revealing the actual amount
- Nullifiers prevent double-use of proofs

**Smart Contract:** `ShieldedBalance.sol`
- `shieldBalance()` — commit a shielded balance
- `verifySufficientShares()` — prove minimum holdings
- `unshield()` — return to public balance

## 3. NULLBOSS Subnet (Avalanche L1)

**Planned Architecture:**
- Deploy as a dedicated Avalanche L1 (subnet) with:
  - Custom gas schedule optimized for AI trade frequency
  - Private mempool via restricted validator set
  - Privacy precompile for encrypted state

**Why a subnet?**
> "NULLBOSS doesn't need privacy to hide — it needs privacy because alpha decays the instant it's visible. Avalanche's subnet architecture is the only L1 stack that lets a hedge fund protocol own its own execution environment instead of sharing a public mempool."

**Deployment Status:** Pending subnet deployment tooling. Currently operates on C-Chain with commit-reveal.

## Integration Points

| Component | Privacy Method | Status |
|-----------|---------------|--------|
| StrategyExecutor | Commit-reveal + private mempool | ✅ Live |
| FundVault | Shielded balances | ⚡ Planned |
| AgentRegistry | Public (identity is meant to be transparent) | ✅ Live |
| FeeRouter | Public | ✅ Live |

## Testing

```bash
forge test --match-contract PrivacyCommitReveal -vvv
forge test --match-contract ShieldedBalance -vvv
```
