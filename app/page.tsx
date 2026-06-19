import { HeroSection } from '@/app/components/HeroSection'
import { StatsSection } from '@/app/components/StatsSection'

export default function Home() {
  return (
    <main className="flex-1">
      <HeroSection />
      <StatsSection />
    </main>
  )
}
