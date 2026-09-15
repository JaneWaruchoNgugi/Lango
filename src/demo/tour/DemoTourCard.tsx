import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight, PartyPopper } from 'lucide-react'
import { useDemoTour } from './DemoTourContext'
import { TOUR_STEPS, TOUR_STEP_COUNT } from './tourState'

export function DemoTourCard() {
  const { active, step, isComplete, next, dismiss } = useDemoTour()
  const navigate = useNavigate()

  // Drive the page to each step's target as the tour advances.
  useEffect(() => {
    if (active && step < TOUR_STEP_COUNT) navigate(TOUR_STEPS[step].to)
  }, [active, step, navigate])

  if (!active) return null

  const wrap = 'fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]'

  if (isComplete) {
    return (
      <div className={wrap}>
        <div className="card p-5 border-lango-primary/30">
          <div className="flex items-center gap-2 text-amber-500 text-xs font-semibold uppercase tracking-wide"><PartyPopper className="w-4 h-4" /> You've seen Lango in action</div>
          <p className="mt-2 text-sm text-gray-600">Visitors. Deliveries. Incidents. Access. Accountability. All connected in one system.</p>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary flex-1" onClick={() => { dismiss(); navigate('/') }}>Book a Free Demo</button>
            <button className="btn-secondary" onClick={dismiss}>Keep exploring</button>
          </div>
        </div>
      </div>
    )
  }

  const s = TOUR_STEPS[step]
  const last = step === TOUR_STEP_COUNT - 1
  return (
    <div className={wrap}>
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lango-primary text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> Step {step + 1} of {TOUR_STEP_COUNT}</div>
          <div className="flex gap-1">
            {Array.from({ length: TOUR_STEP_COUNT }).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= step ? 'bg-lango-primary' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>
        <p className="mt-2 font-semibold text-gray-900">{s.title}</p>
        <p className="mt-1 text-sm text-gray-600">{s.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="text-xs text-gray-400 hover:text-gray-600" onClick={dismiss}>Skip tour</button>
          <button className="btn-primary text-sm" onClick={next}>{last ? 'Finish' : 'Next'} <ArrowRight className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
