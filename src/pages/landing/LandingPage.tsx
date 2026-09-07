import { useState } from 'react'
import { STRINGS, type LandingLang } from './i18n'
import { LandingNav } from './sections/LandingNav'
import { Hero } from './sections/Hero'
import { Segments } from './sections/Segments'
import { HowItWorks } from './sections/HowItWorks'
import { Features } from './sections/Features'
import { WhyLango } from './sections/WhyLango'
import { Pricing } from './sections/Pricing'
import { Faq } from './sections/Faq'
import { LeadForm } from './sections/LeadForm'
import { LandingFooter } from './sections/LandingFooter'

export default function LandingPage() {
  const [lang, setLang] = useState<LandingLang>('en')
  const t = STRINGS[lang]
  return (
    <div className="min-h-screen bg-white">
      <LandingNav t={t} lang={lang} setLang={setLang} />
      <main>
        <Hero t={t} />
        <Segments t={t} />
        <HowItWorks t={t} />
        <Features t={t} />
        <WhyLango t={t} />
        <Pricing t={t} />
        <Faq t={t} />
        <LeadForm t={t} />
      </main>
      <LandingFooter t={t} />
    </div>
  )
}
