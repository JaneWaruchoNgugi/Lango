import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/layouts/AppShell'
import { DemoBanner } from './DemoBanner'
import { DEMO_NAV } from '../config/nav'
import { useDemoStore } from '../store/demoStore'
import type { DemoRole } from '../data/types'

export function DemoShell({ role }: { role: DemoRole }) {
  const navigate = useNavigate()
  const setRole = useDemoStore(s => s.setRole)
  const nav = DEMO_NAV[role]

  // Keep the store's active role in sync with the mounted shell.
  useEffect(() => { setRole(role) }, [role, setRole])

  return (
    <div className="flex flex-col h-full">
      <DemoBanner role={role} />
      <div className="flex-1 min-h-0">
        <AppShell
          navItems={nav.navItems}
          bottomNav={nav.bottomNav}
          roleLabel={nav.roleLabel}
          onSignOut={() => navigate('/')}
          signOutLabel="Exit demo"
        />
      </div>
    </div>
  )
}
