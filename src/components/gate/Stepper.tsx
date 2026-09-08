import { Check } from 'lucide-react'

interface Props {
  /** 1-based index of the current step. */
  current: number
  total?: number
}

/** Numbered 3-dot progress bar used across the Register-a-Guest flow. */
export function Stepper({ current, total = 3 }: Props) {
  const steps = Array.from({ length: total }, (_, i) => i + 1)
  return (
    <div className="flex items-center">
      {steps.map((n, i) => {
        const done = n < current
        const active = n === current
        return (
          <div key={n} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
            <div
              className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                done
                  ? 'bg-lango-primary text-white'
                  : active
                    ? 'bg-lango-primary text-white ring-4 ring-lango-primary/15'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? <Check className="w-4 h-4" /> : n}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-1 flex-1 mx-2 rounded-full ${n < current ? 'bg-lango-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
