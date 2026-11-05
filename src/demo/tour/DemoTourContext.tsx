import { createContext, useContext, useReducer, useCallback, useState, type ReactNode } from 'react'
import { useDemoStore } from '../store/demoStore'
import { useSalonDemo } from '../salon/store'
import { tourReducer, initialTourState, isTourComplete, TOURS, type TourKind, type TourState, type TourAction } from './tourState'

interface DemoTourValue {
  kind: TourKind
  steps: (typeof TOURS)[TourKind]
  active: boolean
  step: number
  isComplete: boolean
  start: (kind?: TourKind) => void
  next: () => void
  dismiss: () => void
}

const DemoTourContext = createContext<DemoTourValue | null>(null)

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<TourKind>('property')
  const steps = TOURS[kind]
  const [state, dispatch] = useReducer((s: TourState, a: TourAction) => tourReducer(s, a, steps.length), initialTourState)
  const setRole = useDemoStore(s => s.setRole)
  const setSalonRole = useSalonDemo(s => s.setRole)

  const start = useCallback((k: TourKind = 'property') => {
    setKind(k)
    if (k === 'salon') setSalonRole('RECEPTION'); else setRole('MANAGER')
    dispatch({ type: 'START' })
  }, [setRole, setSalonRole])
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const dismiss = useCallback(() => dispatch({ type: 'DISMISS' }), [])

  return (
    <DemoTourContext.Provider value={{ kind, steps, active: state.active, step: state.step, isComplete: isTourComplete(state, steps.length), start, next, dismiss }}>
      {children}
    </DemoTourContext.Provider>
  )
}

export function useDemoTour(): DemoTourValue {
  const ctx = useContext(DemoTourContext)
  if (!ctx) throw new Error('useDemoTour must be used within a DemoTourProvider')
  return ctx
}
