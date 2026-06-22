'use client'

import { HeroSection } from '@/app/components/HeroSection'
import { StatsSection } from '@/app/components/StatsSection'
import { ChainStatusBar } from '@/app/components/ChainStatusBar'

export default function Home() {
  return (
    <main className="flex-1">
      <ChainStatusBar />
      <HeroSection />
      <StatsSection />
    </main>
  )
}
