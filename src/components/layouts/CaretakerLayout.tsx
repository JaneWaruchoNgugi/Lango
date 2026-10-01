import { LayoutDashboard, DoorOpen, UserCheck, Building, Package, AlertTriangle, BarChart3, Settings, ShieldCheck, Wrench, CreditCard, ClipboardList } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const NAV: NavItem[] = [
  { to: '/caretaker', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/caretaker/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/caretaker/tenants', label: 'Tenants', icon: UserCheck },
  { to: '/caretaker/blocks', label: 'Blocks & Units', icon: Building },
  { to: '/caretaker/deliveries', label: 'Deliveries', icon: Package },
  { to: '/caretaker/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/caretaker/pre-approved', label: 'Pre-Approved', icon: ShieldCheck },
  { to: '/caretaker/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/caretaker/payments', label: 'Payments', icon: CreditCard },
  { to: '/caretaker/inspections', label: 'Inspections', icon: ClipboardList },
  { to: '/caretaker/reports', label: 'Reports', icon: BarChart3 },
  { to: '/caretaker/settings', label: 'Settings', icon: Settings },
]

const BOTTOM: NavItem[] = [
  { to: '/caretaker', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/caretaker/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/caretaker/deliveries', label: 'Deliveries', icon: Package },
  { to: '/caretaker/tenants', label: 'Tenants', icon: UserCheck },
  { to: '/caretaker/settings', label: 'Settings', icon: Settings },

]

export function CaretakerLayout() {
  return <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Caretaker" settingsTo="/caretaker/settings" />
}
