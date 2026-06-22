'use client'

import { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits, formatUnits, erc20Abi } from 'viem'
import { CONTRACT_ADDRESSES, isDeployed, VAULT_ABI } from '@/app/lib/contracts'

interface VaultActionModalProps {
  mode: 'deposit' | 'withdraw'
  onClose: () => void
}

type Step = 'idle' | 'approving' | 'approve-confirm' | 'executing' | 'done' | 'error'

export function VaultActionModal({ mode, onClose }: VaultActionModalProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [stepError, setStepError] = useState<string | null>(null)

  const vaultAddr = CONTRACT_ADDRESSES.vault

  const { data: assetAddr } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'asset',
    query: { enabled: isDeployed(vaultAddr) },
  })

  const { data: userBalance } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!assetAddr && !!address },
  })

  const { data: userShares } = useReadContract({
    address: vaultAddr,
    abi: VAULT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isDeployed(vaultAddr) },
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: assetAddr,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && vaultAddr ? [address, vaultAddr] : undefined,
    query: { enabled: !!assetAddr && !!address && !!vaultAddr },
  })

  const assetDecimals = 6

  const parsedAmount = amount ? parseUnits(amount, assetDecimals) : BigInt(0)

  const needsApprove = mode === 'deposit' && !!allowance && !!parsedAmount && parsedAmount > allowance

  const {
    writeContract: write,
    data: txHash,
    isPending: txPending,
    error: txError,
  } = useWriteContract()

  const { isSuccess: txConfirmed, isError: txFailed } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  useEffect(() => {
    if (txConfirmed) setStep('done')
  }, [txConfirmed])

  useEffect(() => {
    if (txError) {
      setStep('error')
      setStepError(txError.message)
    }
  }, [txError])

  useEffect(() => {
    if (txFailed) {
      setStep('error')
      setStepError('Transaction reverted')
    }
  }, [txFailed])

  const handleApprove = () => {
    if (!assetAddr || !vaultAddr || !parsedAmount) return
    setStep('approving')
    setStepError(null)
    write({
      address: assetAddr,
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddr, parsedAmount],
    })
  }

  const handleExecute = () => {
    if (!vaultAddr || !address || !parsedAmount) return
    setStep('executing')
    setStepError(null)

    if (mode === 'deposit') {
      write({
        address: vaultAddr,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [parsedAmount, address],
      })
    } else {
      write({
        address: vaultAddr,
        abi: VAULT_ABI,
        functionName: 'redeem',
        args: [parsedAmount, address, address],
      })
    }
  }

  const handleRetry = () => {
    setStep('idle')
    setStepError(null)
    refetchAllowance()
  }

  const isButtonDisabled = !amount || Number(amount) <= 0 || step === 'approving' || step === 'executing' || txPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-lg border border-border bg-raised p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-sm uppercase tracking-[0.15em] text-foreground">
            {mode === 'deposit' ? '[ Deposit USDC ]' : '[ Withdraw ]'}
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
            ? 'Deposit USDC to mint NULLBOSS shares at current NAV.'
            : 'Redeem NULLBOSS shares for pro-rata USDC.'}
        </div>

        {/* Balance info */}
        <div className="mb-4 flex items-center justify-between rounded border border-border bg-surface px-3 py-2 font-mono text-xs">
          <span className="text-foreground-muted">
            {mode === 'deposit' ? 'USDC Balance' : 'Your Shares'}
          </span>
          <span className="text-foreground">
            {mode === 'deposit'
              ? userBalance
                ? formatUnits(userBalance as bigint, assetDecimals)
                : '—'
              : userShares
                ? formatUnits(userShares as bigint, 18)
                : '—'}
          </span>
        </div>

        {/* Amount input */}
        <div className="mb-5">
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.1em] text-foreground-muted">
            Amount
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setStep('idle'); setStepError(null) }}
              placeholder="0.00"
              min="0"
              step="any"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-foreground-muted/40 focus:border-accent-cyan transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              disabled={step === 'done'}
            />
            <button
              type="button"
              onClick={() => {
                if (mode === 'deposit' && userBalance) {
                  setAmount(formatUnits(userBalance as bigint, assetDecimals))
                } else if (mode === 'withdraw' && userShares) {
                  setAmount(formatUnits(userShares as bigint, 18))
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
        </div>

        {/* Action buttons */}
        {step === 'done' ? (
          <div className="rounded border border-accent-green bg-accent-green/5 px-3 py-3 text-center font-mono text-xs text-accent-green">
            {mode === 'deposit' ? 'Deposit submitted' : 'Withdraw submitted'}
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
            {needsApprove && mode === 'deposit' && (
              <button
                type="button"
                onClick={handleApprove}
                disabled={isButtonDisabled}
                className="w-full rounded border border-accent-amber px-3 py-2 font-mono text-xs text-accent-amber hover:bg-accent-amber/5 transition-colors disabled:opacity-30"
              >
                {txPending && step === 'approving' ? 'Approving...' : '[ Approve USDC ]'}
              </button>
            )}
            <button
              type="button"
              onClick={handleExecute}
              disabled={isButtonDisabled}
              className={`w-full rounded px-3 py-2 font-mono text-xs font-medium transition-opacity disabled:opacity-30 ${
                mode === 'deposit'
                  ? 'bg-accent-cyan text-black hover:opacity-90'
                  : 'border border-accent-red text-accent-red hover:bg-accent-red/5'
              }`}
            >
              {txPending && step === 'executing'
                ? mode === 'deposit' ? 'Depositing...' : 'Withdrawing...'
                : mode === 'deposit' ? '[ Deposit ]' : '[ Withdraw ]'}
            </button>
          </div>
        )}

        {txHash && step !== 'error' && step !== 'done' && (
          <div className="mt-3 text-center font-mono text-[10px] text-foreground-muted">
            Tx: {txHash.slice(0, 10)}...{txHash.slice(-6)}
          </div>
        )}
      </div>
    </div>
  )
}
