'use client'

import { useEffect, useRef, useState } from 'react'
import { useConnect, useAccount, useDisconnect, useBalance } from 'wagmi'

const CONNECT_TIMEOUT = 10_000

function WalletIcon({ name }: { name: string }) {
  const id = name.toLowerCase()
  if (id.includes('metamask'))
    return (
      <svg viewBox="0 0 35 33" className="h-5 w-5">
        <polygon fill="#E17726" points="32.7 0 19.9 9.4 22.1 4" />
        <polygon fill="#E27625" points="2.3 0 14.9 9.5 12.8 4" />
        <polygon fill="#EF6947" points="27.8 23.5 24.6 28.3 32.3 30.4 30.2 24" />
        <polygon fill="#EF6947" points="4.8 23.5 2.8 24 4.7 30.4 12.4 28.3" />
        <polygon fill="#D7C1B3" points="12.1 16.9 10 19.5 17.5 19.9 17.3 11.5" />
        <polygon fill="#D7C1B3" points="22.9 16.9 17.7 11.4 17.5 19.9 25 19.5" />
        <polygon fill="#233447" points="12.4 28.3 17 25.8 13 22.8" />
        <polygon fill="#233447" points="18 25.8 22.6 28.3 22 22.8" />
        <polygon fill="#CD6116" points="22.6 28.3 18 25.8 18.3 28.9 18.2 30.3" />
        <polygon fill="#CD6116" points="12.4 28.3 16.8 30.3 16.7 28.9 17 25.8" />
        <polygon fill="#E4751F" points="16.7 22.1 12.8 19.9 15.4 17.2" />
        <polygon fill="#E4751F" points="18.3 22.1 19.6 17.2 22.2 19.9" />
        <polygon fill="#F6851B" points="17.5 19.9 15.4 17.2 16.7 22.1" />
        <polygon fill="#F6851B" points="17.5 19.9 19.6 17.2 18.3 22.1" />
        <polygon fill="#C0AD9F" points="10 19.5 12.1 22.1 12.8 19.9" />
        <polygon fill="#C0AD9F" points="22.2 19.9 22.9 22.1 25 19.5" />
        <polygon fill="#161616" points="24.6 28.3 22.6 28.3 22.8 30.2" />
        <polygon fill="#161616" points="12.4 28.3 12.2 30.2 12.4 30.3 16.8 30.3 16.7 28.9 17 25.8 18 25.8 18.3 28.9 18.2 30.3 22.6 30.3 22.8 30.2 22.6 28.3 24.6 28.3 30.2 24 29.5 19.2 32.3 17.4 31.4 10.4 22.7 4 21.8 8.7 17.6 8.7 13.2 4 4.5 10.3 2.7 17.3 5.5 19.2 4.8 23.9" />
        <polygon fill="#763D16" points="22.6 28.3 22 22.8 22.9 22.1 25 19.5 29.5 19.2 30.2 24" />
        <polygon fill="#763D16" points="12.4 28.3 4.8 24 5.5 19.2 10 19.5 12.1 22.1 12.4 22.8" />
        <polygon fill="#F6851B" points="17.5 11.4 21.8 8.7 22.7 4 17.6 4.7" />
        <polygon fill="#F6851B" points="17.5 11.4 12.3 4 12.8 4 17.3 8.7" />
      </svg>
    )
  if (id.includes('core'))
    return (
      <svg viewBox="0 0 32 32" className="h-5 w-5">
        <circle cx="16" cy="16" r="16" fill="#1A1A1A" />
        <path d="M16 4L28 16L16 28L4 16Z" fill="#FF4D4D" />
        <path d="M16 8L24 16L16 24L8 16Z" fill="#1A1A1A" />
        <circle cx="16" cy="16" r="4" fill="#FF4D4D" />
      </svg>
    )
  return (
    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[10px] font-bold text-foreground-muted">
      {name.charAt(0)}
    </div>
  )
}

export function ConnectWallet() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, error, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { data: balance } = useBalance({ address })
  const [localError, setLocalError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPending) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      return
    }
    timeoutRef.current = setTimeout(() => {
      setLocalError(
        typeof window !== 'undefined' && (window as any).ethereum
          ? 'Wallet is not responding — check your extension.'
          : 'No wallet detected. Install MetaMask or Core Wallet.'
      )
    }, CONNECT_TIMEOUT)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isPending])

  useEffect(() => {
    if (error) {
      if ((error as any)?.code === -32002) {
        setLocalError('A wallet request is already pending — check your extension.')
      } else {
        setLocalError(error.message || 'Connection failed')
      }
    }
  }, [error])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false)
      }
    }
    if (showPicker) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showPicker])

  const displayError = localError

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <div className="flex items-center gap-1.5 rounded border border-border bg-surface px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          <span className="text-foreground-muted">
            {address.slice(0, 6)}...{address.slice(-4)}
          </span>
          {balance && (
            <span className="text-foreground-muted/60">
              {(Number(balance.value) / 10 ** balance.decimals).toFixed(3)} AVAX
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => { disconnect(); setLocalError(null) }}
          className="rounded border border-border px-2 py-1 font-mono text-[10px] text-foreground-muted hover:text-accent-red transition-colors"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => {
          setLocalError(null)
          if (typeof window !== 'undefined' && !(window as any).ethereum && connectors.length === 0) {
            setLocalError('No wallet detected. Install MetaMask or Core Wallet.')
            return
          }
          setShowPicker(!showPicker)
        }}
        disabled={isPending}
        className="rounded border border-border px-3 py-1.5 font-mono text-xs text-foreground hover:bg-surface transition-colors disabled:opacity-50 whitespace-nowrap"
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-raised shadow-xl animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-foreground-muted">
            Select Wallet
          </div>
          {connectors.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setLocalError(null)
                setShowPicker(false)
                connect({ connector: c })
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 font-mono text-xs text-foreground hover:bg-surface transition-colors text-left"
            >
              <WalletIcon name={c.name} />
              <span>{c.name}</span>
            </button>
          ))}
          {connectors.length === 0 && (
            <div className="px-3 py-4 text-center font-mono text-[10px] text-foreground-muted">
              No wallets detected.
            </div>
          )}
        </div>
      )}

      {displayError && (
        <div className="max-w-[200px] text-right font-mono text-[10px] text-accent-red leading-tight">
          {displayError}
        </div>
      )}
    </div>
  )
}
