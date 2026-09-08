import { LayoutDashboard, DoorOpen, UserCheck, Building, Package, AlertTriangle, Users, BarChart3, Settings } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const NAV: NavItem[] = [
  { to: '/caretaker', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/caretaker/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/caretaker/tenants', label: 'Tenants', icon: UserCheck },
  { to: '/caretaker/blocks', label: 'Blocks & Units', icon: Building },
  { to: '/caretaker/deliveries', label: 'Deliveries', icon: Package },
  { to: '/caretaker/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/caretaker/staff', label: 'Staff', icon: Users },
  { to: '/caretaker/reports', label: 'Reports', icon: BarChart3 },
  { to: '/caretaker/settings', label: 'Settings', icon: Settings },
]

const BOTTOM: NavItem[] = [
  { to: '/caretaker', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/caretaker/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/caretaker/deliveries', label: 'Deliveries', icon: Package },
]

export function CaretakerLayout() {
  return <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Caretaker" settingsTo="/caretaker/settings" />
}
