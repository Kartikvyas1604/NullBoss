'use client'

import { useEffect, useState, useRef } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/app/lib/wagmi'
import { parseUnits, formatUnits, erc20Abi, createPublicClient, http } from 'viem'
import { avalancheFuji, avalanche } from 'viem/chains'
import { CONTRACT_ADDRESSES, isDeployed, VAULT_ABI } from '@/app/lib/contracts'

interface VaultActionModalProps {
  mode: 'deposit' | 'withdraw'
  onClose: () => void
  onSuccess?: () => void
}

type Step = 'idle' | 'approving' | 'depositing' | 'withdrawing' | 'done' | 'error'

const FUJI_EXPLORER = 'https://testnet.snowtrace.io/tx'
const MAINNET_EXPLORER = 'https://snowtrace.io/tx'
const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 43113)
const EXPLORER = CHAIN_ID === 43114 ? MAINNET_EXPLORER : FUJI_EXPLORER

const COMMON_ERRORS: Record<string, string> = {
  'user rejected': 'Transaction rejected in wallet.',
  'rejected': 'Transaction rejected in wallet.',
  'UserRejected': 'Transaction rejected in wallet.',
  'insufficient funds': 'Insufficient AVAX for gas.',
  'insufficient balance': 'Insufficient balance.',
  'max redeem': 'You do not have enough shares.',
  'ERC20InsufficientBalance': 'Insufficient share balance.',
  'execution reverted: ERC4626: redeem more than maxRedeem': 'You are trying to withdraw more shares than you own.',
}

function shortenError(err: unknown): string {
  const msg =
    (err as any)?.shortMessage ||
    (err as any)?.message ||
    (err as any)?.reason ||
    String(err)

  for (const [key, label] of Object.entries(COMMON_ERRORS)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) return label
  }

  const clean = msg.replace(/^.*reverted with reason string '/, '').replace(/'$/, '').replace(/^.*reverted: /, '')
  return clean.length > 120 ? clean.slice(0, 120) + '...' : clean
}

export function VaultActionModal({ mode, onClose, onSuccess }: VaultActionModalProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [stepError, setStepError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const isProcessing = useRef(false)

  const vaultAddr = CONTRACT_ADDRESSES.vault
  const agentWallet = CONTRACT_ADDRESSES.agentWallet
  const isWithdraw = mode === 'withdraw'

  const { data: assetAddr } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'asset',
    query: { enabled: isDeployed(vaultAddr) },
  })

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddr && !!address },
  })

  const { data: agentWalletBalance, refetch: refetchAgentBalance } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: agentWallet ? [agentWallet] : undefined,
    query: { enabled: !!assetAddr && !!agentWallet && isDeployed(agentWallet) },
  })

  const { data: userShares, refetch: refetchShares } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isDeployed(vaultAddr) },
  })

  const { data: maxRedeem } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'maxRedeem',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isDeployed(vaultAddr) },
  })

  const { data: expectedAssets, isFetching: previewLoading } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'previewRedeem',
    args: isWithdraw && parseUnits(amount || '0', 18) > 0n ? [parseUnits(amount, 18)] : undefined,
    query: { enabled: isWithdraw && !!amount && Number(amount) > 0 && isDeployed(vaultAddr) },
  })

  const { writeContractAsync } = useWriteContract()

  const assetDecimals = 6
  const shareDecimals = 18
  const parsedAmount = parseUnits(amount || '0', isWithdraw ? shareDecimals : assetDecimals)

  useEffect(() => {
    if (step === 'idle') {
      setTxHash(null)
      setStepError(null)
    }
  }, [step])

  const handleSubmit = async () => {
    if (!vaultAddr || !address || !assetAddr || !parsedAmount || isProcessing.current) return
    if (isWithdraw && (!agentWallet || !isDeployed(agentWallet))) return
    isProcessing.current = true

    try {
      if (isWithdraw) {
        setStep('withdrawing')
        setStepError(null)

        const hash = await writeContractAsync({
          address: vaultAddr,
          abi: VAULT_ABI,
          functionName: 'redeem',
          args: [parsedAmount, address, address],
        })
        setTxHash(hash)

        await waitForTransactionReceipt(config, { hash, confirmations: 1 })

        await Promise.all([refetchBalance(), refetchShares()])
        onSuccess?.()
        setStep('done')
      } else {
        setStep('depositing')
        setStepError(null)

        const hash = await writeContractAsync({
          address: assetAddr,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [agentWallet!, parsedAmount],
        })
        setTxHash(hash)

        await waitForTransactionReceipt(config, { hash, confirmations: 1 })

        await Promise.all([refetchBalance(), refetchAgentBalance()])
        onSuccess?.()
        setStep('done')
      }
    } catch (err: any) {
      setStep('error')
      setStepError(shortenError(err))
    } finally {
      isProcessing.current = false
    }
  }

  const handleRetry = () => {
    setStep('idle')
    setStepError(null)
    setTxHash(null)
  }

  const isProcessingTx = step === 'approving' || step === 'depositing' || step === 'withdrawing'

  const exceedsMaxRedeem = isWithdraw && maxRedeem !== undefined && parsedAmount > 0n && parsedAmount > (maxRedeem as bigint)
  const exceedsBalance = !isWithdraw && userBalance !== undefined && parsedAmount > 0n && parsedAmount > (userBalance as bigint)
  const isButtonDisabled = !amount || Number(amount) <= 0 || isProcessingTx || !!exceedsMaxRedeem || !!exceedsBalance

  const showPreview = isWithdraw && parsedAmount > 0n && expectedAssets !== undefined && !previewLoading

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-raised p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-foreground">
            {mode === 'deposit' ? '[ Fund Agent Wallet ]' : '[ Withdraw Shares ]'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs text-foreground-muted hover:text-foreground transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 font-mono text-[10px] text-foreground-muted">
          {mode === 'deposit'
            ? 'Send USDC to the AI agent wallet for on-chain trading. Redeem shares from the vault to withdraw.'
            : 'Redeem NULLBOSS shares for pro-rata USDC.'}
        </div>

        {mode === 'deposit' && agentWalletBalance !== undefined && (
          <div className="mb-2 flex items-center justify-between rounded border border-accent-cyan/10 bg-accent-cyan/5 px-3 py-1.5 font-mono text-[10px]">
            <span className="text-foreground-muted">Agent Trading Capital</span>
            <span className="text-accent-cyan">{formatUnits(agentWalletBalance as bigint, 6)} USDC</span>
          </div>
        )}

        <div className="mb-4 flex items-center justify-between rounded border border-border bg-surface px-3 py-2 font-mono text-xs">
          <span className="text-foreground-muted">
            {mode === 'deposit' ? 'Your USDC Balance' : 'Your Shares'}
          </span>
          <span className="text-foreground">
            {mode === 'deposit'
              ? userBalance !== undefined
                ? formatUnits(userBalance as bigint, assetDecimals)
                : '—'
              : userShares !== undefined
                ? formatUnits(userShares as bigint, shareDecimals)
                : '—'}
          </span>
        </div>

        {isWithdraw && showPreview && (
          <div className="mb-4 flex items-center justify-between rounded border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2 font-mono text-xs">
            <span className="text-foreground-muted">You will receive</span>
            <span className="text-accent-cyan">
              ~{formatUnits(expectedAssets as bigint, assetDecimals)} USDC
            </span>
          </div>
        )}

        {isWithdraw && previewLoading && parsedAmount > 0n && (
          <div className="mb-4 flex items-center justify-between rounded border border-border bg-surface px-3 py-2 font-mono text-xs">
            <span className="text-foreground-muted">You will receive</span>
            <span className="text-foreground-muted">Loading...</span>
          </div>
        )}

        <div className="mb-5">
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-foreground-muted">
            Amount {isWithdraw ? '(shares)' : '(USDC)'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setStep('idle'); setStepError(null) }}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-foreground-muted/40 focus:border-accent-cyan transition-colors [appearance:textfield] [&::-webkit-inner-spin-number]:appearance-none [&::-webkit-outer-spin-number]:appearance-none"
              disabled={step === 'done'}
            />
            <button
              type="button"
              onClick={() => {
                if (mode === 'deposit' && userBalance) {
                  setAmount(formatUnits(userBalance as bigint, assetDecimals))
                } else if (mode === 'withdraw' && userShares) {
                  setAmount(formatUnits(userShares as bigint, shareDecimals))
                }
                setStep('idle')
                setStepError(null)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted hover:text-foreground transition-colors"
              disabled={step === 'done'}
            >
              MAX
            </button>
          </div>
          {exceedsMaxRedeem && (
            <p className="mt-1 font-mono text-[10px] text-accent-red">
              Amount exceeds your share balance.
            </p>
          )}
          {exceedsBalance && (
            <p className="mt-1 font-mono text-[10px] text-accent-red">
              Amount exceeds your USDC balance.
            </p>
          )}
        </div>

        {step === 'done' ? (
          <div className="space-y-3">
            <div className="rounded border border-accent-green bg-accent-green/5 px-3 py-3 text-center font-mono text-xs text-accent-green">
              {mode === 'deposit' ? 'Sent to agent wallet' : 'Withdraw confirmed'}
            </div>
            {txHash && (
              <a
                href={`${EXPLORER}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded border border-border px-3 py-2 text-center font-mono text-[10px] text-foreground-muted hover:text-accent-cyan transition-colors"
              >
                {txHash.slice(0, 10)}...{txHash.slice(-6)}
              </a>
            )}
          </div>
        ) : step === 'error' ? (
          <div className="space-y-2">
            <div className="rounded border border-accent-red bg-accent-red/5 px-3 py-2 font-mono text-[10px] text-accent-red break-all leading-relaxed">
              {stepError || 'Transaction failed'}
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="w-full rounded border border-border px-3 py-2 font-mono text-xs text-foreground hover:bg-surface transition-colors"
            >
              [ Retry ]
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isButtonDisabled}
              className={`w-full rounded px-3 py-2 font-mono text-xs font-medium transition-opacity disabled:opacity-30 ${
                mode === 'deposit'
                  ? 'bg-accent-cyan text-black hover:opacity-90'
                  : 'border border-accent-red text-accent-red hover:bg-accent-red/5'
              }`}
            >
              {step === 'approving'
                ? '[ Approving... ]'
                : step === 'depositing'
                  ? '[ Sending... ]'
                  : step === 'withdrawing'
                    ? '[ Withdrawing... ]'
                    : mode === 'deposit'
                      ? '[ Send to Agent Wallet ]'
                      : '[ Withdraw ]'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
