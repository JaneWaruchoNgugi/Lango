import { LayoutDashboard, Users, UserCheck, BarChart3, Settings, ShieldCheck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppShell, type NavItem } from './AppShell'

export function SalonOwnerLayout() {
  const { salonId } = useParams<{ salonId: string }>()
  const base = `/salon/${salonId}/owner`

  const NAV: NavItem[] = [
    { to: base,                          label: 'Dashboard',     icon: LayoutDashboard, end: true },
    { to: `${base}/providers`,           label: 'Providers',     icon: Users },
    { to: `${base}/receptionists`,       label: 'Receptionists', icon: UserCheck },
    { to: `${base}/staff-permissions`,   label: 'Permissions',   icon: ShieldCheck },
    { to: `${base}/reports`,             label: 'Reports',       icon: BarChart3 },
    { to: `${base}/settings`,            label: 'Settings',      icon: Settings },
  ]

  const BOTTOM: NavItem[] = [
    { to: base,                         label: 'Dashboard',  icon: LayoutDashboard, end: true },
    { to: `${base}/providers`,          label: 'Providers',  icon: Users },
    { to: `${base}/staff-permissions`,  label: 'Perms',      icon: ShieldCheck },
    { to: `${base}/receptionists`,      label: 'Reception',  icon: UserCheck },
    { to: `${base}/reports`,            label: 'Reports',    icon: BarChart3 },
  ]

  return (
    <AppShell
      navItems={NAV}
      bottomNav={BOTTOM}
      roleLabel="Salon Owner"
      settingsTo={`${base}/settings`}
    />
  )
}
