'use client'

import { useState } from 'react'
import { useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi'
import { AnimatedNumber } from '@/app/components/AnimatedNumber'
import { HeartbeatIndicator } from '@/app/components/HeartbeatIndicator'
import { DataRow } from '@/app/components/DataRow'
import { SectionHeader } from '@/app/components/SectionHeader'
import { SkeletonCard } from '@/app/components/Skeleton'
import { VaultActionModal } from '@/app/components/VaultActionModal'
import { useFundState } from '@/app/hooks/useFundState'
import { formatUsd, formatPercent } from '@/app/lib/formatters'
import { CHAIN_NAMES } from '@/app/lib/contracts'

const SUPPORTED_CHAIN_IDS = [43114, 43113]

export default function DashboardPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { state, isLoading, notDeployed, refresh: refreshVault } = useFundState()
  const { data: balance } = useBalance({ address })
  const [action, setAction] = useState<'deposit' | 'withdraw' | null>(null)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const onCorrectNetwork = SUPPORTED_CHAIN_IDS.includes(chainId)
  const chainName = CHAIN_NAMES[chainId] || `Chain ${chainId}`

  if (isLoading) {
    return (
      <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <SkeletonCard />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><SkeletonCard /></div>
          <SkeletonCard />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <SectionHeader title="Dashboard" subtitle="Your position in the fund" accent="cyan" />
        <HeartbeatIndicator />
      </div>

      {!isConnected && (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-border p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-foreground-muted">[ ]</div>
          <p className="font-mono text-sm text-foreground-muted">
            Connect your wallet to view your position.
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Avalanche C-Chain · chainId 43114
          </p>
        </div>
      )}

      {isConnected && !onCorrectNetwork && (
        <div className="grid-bg flex flex-col items-center justify-center rounded-lg border border-accent-red p-8 text-center sm:p-16">
          <div className="mb-4 font-mono text-4xl text-accent-red glow-text-red">[!]</div>
          <p className="font-mono text-sm text-accent-red">
            Wrong network detected
          </p>
          <p className="mt-1 font-mono text-xs text-foreground-muted">
            Connected to {chainName} (chainId {chainId}). Switch to Avalanche C-Chain.
          </p>
          <button
            type="button"
            onClick={async () => {
              setSwitchError(null)
              try {
                await switchChain({ chainId: 43114 })
              } catch (err) {
                setSwitchError(err instanceof Error ? err.message : 'Failed to switch chain')
              }
            }}
            className="mt-4 rounded bg-accent-red px-4 py-2 font-mono text-xs font-medium text-white transition-opacity hover:opacity-90"
          >
            [ Switch to Avalanche C-Chain ]
          </button>
          {switchError && (
            <p className="mt-2 max-w-xs font-mono text-[10px] text-accent-red/80 leading-tight">
              {switchError}
            </p>
          )}
        </div>
      )}

      {isConnected && onCorrectNetwork && (
        <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
          {/* Position Summary */}
          <div className="rounded-lg border border-border bg-surface p-4 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Position Summary
            </h2>
            {notDeployed || !state ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2 font-mono text-xs text-accent-amber">Fund not yet deployed</div>
                <p className="font-mono text-[10px] text-foreground-muted">
                  Vault contract address not configured. Position data will appear once deployed.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                    NAV / Share
                  </div>
                  <div className="font-mono text-xl text-accent-cyan sm:text-2xl">
                    <AnimatedNumber value={state.nav} prefix="$" decimals={2} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                    TVL
                  </div>
                  <div className="font-mono text-xl text-foreground sm:text-2xl">
                    {formatUsd(state.totalValueLocked)}
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                    Shares Outstanding
                  </div>
                  <div className="font-mono text-xl text-foreground sm:text-2xl">
                    <AnimatedNumber value={state.sharesOutstanding} decimals={0} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.15em] text-foreground-muted">
                    Since Inception
                  </div>
                  <div
                    className={`font-mono text-xl sm:text-2xl ${
                      state.sinceInceptionReturn >= 0
                        ? 'text-accent-green glow-text-green'
                        : 'text-accent-red glow-text-red'
                    }`}
                  >
                    {formatPercent(state.sinceInceptionReturn, true)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Wallet Info */}
          <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Wallet
            </h2>
            <div className="space-y-1">
              <DataRow
                label="Address"
                value={address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '—'}
              />
              <DataRow
                label="AVAX Balance"
                value={balance ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} AVAX` : '—'}
              />
              <DataRow
                label="Network"
                value={chainName}
                valueColor={onCorrectNetwork ? 'text-accent-green' : 'text-accent-red'}
              />
            </div>
          </div>

          {/* Actions - gated behind connected + correct network */}
          <div className="rounded-lg border border-border bg-surface p-4 sm:p-6 lg:col-span-2">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-foreground-muted">
              Transactions
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded border border-border bg-background p-4">
                <div className="mb-3 font-mono text-sm text-foreground">Deposit</div>
                <div className="mb-3 font-mono text-xs text-foreground-muted">
                  Deposit USDC to mint NULLBOSS shares at current NAV.
                </div>
                <button
                  type="button"
                  disabled={!onCorrectNetwork}
                  onClick={() => setAction('deposit')}
                  className="w-full rounded bg-accent-cyan px-4 py-2 font-mono text-xs font-medium text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {onCorrectNetwork ? '[ Deposit ]' : '[ Switch Network ]'}
                </button>
              </div>
              <div className="rounded border border-border bg-background p-4">
                <div className="mb-3 font-mono text-sm text-foreground">Withdraw</div>
                <div className="mb-3 font-mono text-xs text-foreground-muted">
                  Redeem shares for pro-rata share of vault assets at current NAV.
                </div>
                <button
                  type="button"
                  disabled={!onCorrectNetwork}
                  onClick={() => setAction('withdraw')}
                  className="w-full rounded border border-accent-red px-4 py-2 font-mono text-xs font-medium text-accent-red transition-colors hover:bg-accent-red-dim disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {onCorrectNetwork ? '[ Withdraw ]' : '[ Switch Network ]'}
                </button>
              </div>
            </div>
            {!notDeployed && (
              <div className="mt-4 font-mono text-[10px] text-foreground-muted text-center">
                Vault: {process.env.NEXT_PUBLIC_VAULT_ADDRESS?.slice(0, 10)}...{process.env.NEXT_PUBLIC_VAULT_ADDRESS?.slice(-6) || 'not set'}
              </div>
            )}
          </div>
        </div>
      )}

      {action && (
        <VaultActionModal
          mode={action}
          onClose={() => setAction(null)}
          onSuccess={refreshVault}
        />
      )}
    </main>
  )
}
