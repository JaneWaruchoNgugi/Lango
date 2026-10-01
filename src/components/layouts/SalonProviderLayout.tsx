import { Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppShell, type NavItem } from './AppShell'

export function SalonProviderLayout() {
  const { salonId } = useParams<{ salonId: string }>()
  const base = `/salon/${salonId}/provider`

  const NAV: NavItem[] = [
    { to: base, label: 'My Clients', icon: Users, end: true },
  ]

  const BOTTOM: NavItem[] = [
    { to: base, label: 'My Clients', icon: Users, end: true },
  ]

  return (
    <AppShell
      navItems={NAV}
      bottomNav={BOTTOM}
      roleLabel="Service Provider"
    />
  )
}
