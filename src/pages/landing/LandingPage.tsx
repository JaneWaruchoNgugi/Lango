import { LandingNav } from './sections/LandingNav'
import { Hero } from './sections/Hero'
import { HowItWorks } from './sections/HowItWorks'
import { Features } from './sections/Features'
import { Pricing } from './sections/Pricing'
import { CtaDemo } from './sections/CtaDemo'
import { LandingFooter } from './sections/LandingFooter'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Pricing />
        <CtaDemo />
      </main>
      <LandingFooter />
    </div>
  )
}
