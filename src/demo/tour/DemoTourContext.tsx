import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react'
import { useDemoStore } from '../store/demoStore'
import { tourReducer, initialTourState, isTourComplete } from './tourState'

interface DemoTourValue {
  active: boolean
  step: number
  isComplete: boolean
  start: () => void
  next: () => void
  dismiss: () => void
}

const DemoTourContext = createContext<DemoTourValue | null>(null)

export function DemoTourProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tourReducer, initialTourState)
  const setRole = useDemoStore(s => s.setRole)

  const start = useCallback(() => { setRole('MANAGER'); dispatch({ type: 'START' }) }, [setRole])
  const next = useCallback(() => dispatch({ type: 'NEXT' }), [])
  const dismiss = useCallback(() => dispatch({ type: 'DISMISS' }), [])

  return (
    <DemoTourContext.Provider value={{ active: state.active, step: state.step, isComplete: isTourComplete(state), start, next, dismiss }}>
      {children}
    </DemoTourContext.Provider>
  )
}

export function useDemoTour(): DemoTourValue {
  const ctx = useContext(DemoTourContext)
  if (!ctx) throw new Error('useDemoTour must be used within a DemoTourProvider')
  return ctx
}
