'use client'

import { useEffect, useState, useRef } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { waitForTransactionReceipt } from '@wagmi/core'
import { config } from '@/app/lib/wagmi'
import { parseUnits, formatUnits, erc20Abi, createPublicClient, http } from 'viem'
import { avalancheFuji } from 'viem/chains'
import { CONTRACT_ADDRESSES, isDeployed, VAULT_ABI } from '@/app/lib/contracts'

interface VaultActionModalProps {
  mode: 'deposit' | 'withdraw'
  onClose: () => void
}

type Step = 'idle' | 'approving' | 'depositing' | 'done' | 'error'

export function VaultActionModal({ mode, onClose }: VaultActionModalProps) {
  const { address } = useAccount()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [stepError, setStepError] = useState<string | null>(null)
  const [approveHash, setApproveHash] = useState<`0x${string}` | null>(null)
  const isProcessing = useRef(false)

  const vaultAddr = CONTRACT_ADDRESSES.vault

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

  const { writeContractAsync } = useWriteContract()

  const assetDecimals = 6
  const parsedAmount = amount ? parseUnits(amount, assetDecimals) : BigInt(0)

  const handleDeposit = async () => {
    if (!vaultAddr || !address || !assetAddr || !parsedAmount || isProcessing.current) return
    isProcessing.current = true

    try {
      if (mode === 'deposit') {
        const publicClient = createPublicClient({
          chain: avalancheFuji,
          transport: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc'),
        })
        const currentAllowance = await publicClient.readContract({
          address: assetAddr,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, vaultAddr],
        }) as bigint

        if (currentAllowance < parsedAmount) {
          setStep('approving')
          setStepError(null)

          const hash = await writeContractAsync({
            address: assetAddr,
            abi: erc20Abi,
            functionName: 'approve',
            args: [vaultAddr, parsedAmount],
          })
          await waitForTransactionReceipt(config, { hash, confirmations: 1 })
          await refetchAllowance()
        }
      }

      setStep('depositing')
      setStepError(null)

      if (mode === 'deposit') {
        await writeContractAsync({
          address: vaultAddr,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [parsedAmount, address],
        })
      } else {
        await writeContractAsync({
          address: vaultAddr,
          abi: VAULT_ABI,
          functionName: 'redeem',
          args: [parsedAmount, address, address],
        })
      }

      await refetchBalance()
      setStep('done')
    } catch (err: any) {
      setStep('error')
      setStepError(err?.message || err?.shortMessage || 'Transaction failed')
    } finally {
      isProcessing.current = false
    }
  }

  const handleRetry = () => {
    setStep('idle')
    setStepError(null)
    setApproveHash(null)
    refetchAllowance()
  }

  const isButtonDisabled = !amount || Number(amount) <= 0 || step === 'approving' || step === 'depositing'

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
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-foreground-muted/40 focus:border-accent-cyan transition-colors [appearance:textfield] [&::-webkit-inner-spin-number]:appearance-none [&::-webkit-outer-spin-number]:appearance-none"
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
            <button
              type="button"
              onClick={handleDeposit}
              disabled={isButtonDisabled}
              className={`w-full rounded px-3 py-2 font-mono text-xs font-medium transition-opacity disabled:opacity-30 ${
                mode === 'deposit'
                  ? 'bg-accent-cyan text-black hover:opacity-90'
                  : 'border border-accent-red text-accent-red hover:bg-accent-red/5'
              }`}
            >
              {step === 'approving' ? '[ Approving... ]' : step === 'depositing' ? '[ Depositing... ]' : mode === 'deposit' ? '[ Deposit ]' : '[ Withdraw ]'}
            </button>
          </div>
        )}

        {mode === 'deposit' && step === 'idle' && !!parsedAmount && (
          <div className="mt-2 text-center font-mono text-[10px] text-foreground-muted">
            MetaMask will prompt twice (approve + deposit).
          </div>
        )}
      </div>
    </div>
  )
}
