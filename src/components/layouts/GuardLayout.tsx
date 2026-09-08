import { Home, UserPlus, Package, Users, AlertTriangle, Clock } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const NAV: NavItem[] = [
  { to: '/gate', label: 'Home', icon: Home, end: true },
  { to: '/gate/register', label: 'Register Visitor', icon: UserPlus },
  { to: '/gate/deliveries', label: 'Delivery Check-in', icon: Package },
  { to: '/gate/inside', label: 'Currently Inside', icon: Users },
  { to: '/gate/incidents', label: 'Report Incident', icon: AlertTriangle },
  { to: '/gate/shift', label: 'My Shift', icon: Clock },
]

const BOTTOM: NavItem[] = [
  { to: '/gate', label: 'Home', icon: Home, end: true },
  { to: '/gate/deliveries', label: 'Deliveries', icon: Package },
  { to: '/gate/inside', label: 'Inside', icon: Users },
  { to: '/gate/shift', label: 'My Shift', icon: Clock },
]

export function GuardLayout() {
  return <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Security Guard" />
}
