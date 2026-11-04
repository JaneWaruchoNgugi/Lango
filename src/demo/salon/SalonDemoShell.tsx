import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw, LogOut, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import { AppShell } from '../../components/layouts/AppShell'
import { useSalonDemo } from './store'
import { SALON_DEMO_NAV, SALON_ROLE_PATH } from './nav'
import type { SalonDemoRole } from './data'

const ROLES: { key: SalonDemoRole; label: string }[] = [
  { key: 'OWNER', label: 'Owner' }, { key: 'RECEPTION', label: 'Reception' }, { key: 'PROVIDER', label: 'Provider' },
]

/** Demo banner + the real app shell, for the salon demo roles. */
export function SalonDemoShell({ role }: { role: SalonDemoRole }) {
  const navigate = useNavigate()
  const setRole = useSalonDemo(s => s.setRole)
  const resetDemo = useSalonDemo(s => s.resetDemo)
  const nav = SALON_DEMO_NAV[role]

  useEffect(() => { setRole(role) }, [role, setRole])

  return (
    <div className="flex flex-col h-full">
      <div className="bg-lango-dark text-white px-3 sm:px-4 py-2 flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
          <Sparkles className="w-3.5 h-3.5" /> Salon demo
        </span>
        <span className="hidden lg:inline text-xs text-white/50">Sample data, nothing here is real</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div role="tablist" aria-label="Switch demo role" className="flex items-center gap-0.5 rounded-lg bg-white/5 p-0.5 mr-1">
            {ROLES.map(r => (
              <button key={r.key} role="tab" aria-selected={role === r.key} onClick={() => navigate(SALON_ROLE_PATH[r.key])}
                className={`px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${role === r.key ? 'bg-lango-primary text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}>
                {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => { resetDemo(); toast.success('Salon demo reset to sample data') }} aria-label="Reset demo"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
            <RefreshCw className="w-3.5 h-3.5" /><span className="hidden sm:inline">Reset</span>
          </button>
          <button onClick={() => navigate('/demo')} aria-label="Exit demo"
            className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-xs font-medium bg-white/10 hover:bg-white/20">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <AppShell navItems={nav.navItems} bottomNav={nav.bottomNav} roleLabel={nav.roleLabel}
          onSignOut={() => navigate('/demo')} signOutLabel="Exit demo" />
      </div>
    </div>
  )
}
