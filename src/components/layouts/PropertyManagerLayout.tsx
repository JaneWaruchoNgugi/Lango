import { LayoutDashboard, DoorOpen, UserCheck, Building, Package, AlertTriangle, Users, BarChart3, Settings, Shield, ShieldCheck, Wrench, CreditCard, FileText, MessageSquare, Ban, Link2 } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const NAV: NavItem[] = [
  { to: '/property', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/property/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/property/tenants', label: 'Tenants', icon: UserCheck },
  { to: '/property/units', label: 'Blocks & Units', icon: Building },
  { to: '/property/deliveries', label: 'Deliveries', icon: Package },
  { to: '/property/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/property/security-team', label: 'Security Team', icon: Shield },
  { to: '/property/staff', label: 'Staff', icon: Users },
  { to: '/property/pre-approved', label: 'Pre-Approved', icon: ShieldCheck },
  { to: '/property/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/property/financials', label: 'Financials', icon: CreditCard },
  { to: '/property/leases', label: 'Leases', icon: FileText },
  { to: '/property/complaints', label: 'Complaints', icon: MessageSquare },
  { to: '/property/blacklist', label: 'Blacklist', icon: Ban },
  { to: '/property/tenant-portal', label: 'Tenant Portal', icon: Link2 },
  { to: '/property/reports', label: 'Reports', icon: BarChart3 },
  { to: '/property/settings', label: 'Settings', icon: Settings },
]

const BOTTOM: NavItem[] = [
  { to: '/property', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/property/visitors', label: 'Visitors', icon: DoorOpen },
  { to: '/property/deliveries', label: 'Deliveries', icon: Package },
  { to: '/property/staff', label: 'Staff', icon: Users },

  // { to: '/property/security-team', label: 'Security', icon: Shield },
  { to: '/property/settings', label: 'Settings', icon: Settings },
]

export function PropertyManagerLayout() {
  return <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Property Manager" settingsTo="/property/settings" />
}
