import { LayoutDashboard, Building2, Users, CreditCard, Inbox, BarChart3, Bell, ScrollText, Settings } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/staff', label: 'Staff', icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/leads', label: 'Leads', icon: Inbox },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/audit-logs', label: 'System Logs', icon: ScrollText },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const BOTTOM: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/properties', label: 'Properties', icon: Building2 },
  { to: '/admin/staff', label: 'Staff', icon: Users },
]

export function AdminLayout() {
  return <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Super Admin" settingsTo="/admin/settings" />
}
