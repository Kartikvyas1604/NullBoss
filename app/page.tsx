'use client'

import { useCallback, useState } from 'react'
import { HeroSection } from '@/app/components/HeroSection'
import { StatsSection } from '@/app/components/StatsSection'
import { BootSequence } from '@/app/components/BootSequence'

export default function Home() {
  const [booted, setBooted] = useState(false)

  const handleBootComplete = useCallback(() => {
    setBooted(true)
  }, [])

  if (!booted) {
    return <BootSequence onComplete={handleBootComplete} />
  }

  return (
    <main className="flex-1">
      <HeroSection />
      <StatsSection />
    </main>
  )
}
