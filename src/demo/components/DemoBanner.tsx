import { useNavigate } from 'react-router-dom'
import { RefreshCw, LogOut, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

const ROLE_PATH: Record<DemoRole, string> = {
  MANAGER: '/demo/manager', GUARD: '/demo/guard', CARETAKER: '/demo/caretaker',
}
const ROLES: { key: DemoRole; label: string }[] = [
  { key: 'MANAGER', label: 'Manager' }, { key: 'GUARD', label: 'Guard' },
  { key: 'CARETAKER', label: 'Caretaker' },
]

export function DemoBanner({ role }: { role: DemoRole }) {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const resetDemo = useDemoStore(s => s.resetDemo)

  const switchRole = (r: DemoRole) => { setRole(r); navigate(ROLE_PATH[r]) }
  const reset = () => { resetDemo(); toast.success('Demo reset to sample data') }

  return (
    <div className="bg-lango-dark text-white px-3 sm:px-4 py-2 flex items-center gap-3 flex-wrap">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
        <Sparkles className="w-3.5 h-3.5" /> Demo Mode
      </span>
      <span className="hidden sm:inline text-xs text-white/50">Sample data — nothing here is real</span>
      <div className="ml-auto flex items-center gap-2">
        <div className="hidden md:flex items-center gap-1 mr-1">
          {ROLES.map(r => (
            <button key={r.key} onClick={() => switchRole(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${role === r.key ? 'bg-lango-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={reset} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
          <LogOut className="w-3.5 h-3.5" /> Exit
        </button>
      </div>
    </div>
  )
}
