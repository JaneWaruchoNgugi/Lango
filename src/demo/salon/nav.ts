import { LayoutDashboard, Scissors, BarChart3, UserPlus, ShoppingBag, Users } from 'lucide-react'
import type { NavItem } from '../../components/layouts/AppShell'
import type { SalonDemoRole } from './data'

export const SALON_ROLE_PATH: Record<SalonDemoRole, string> = {
  OWNER: '/demo/salon/owner', RECEPTION: '/demo/salon/reception', PROVIDER: '/demo/salon/provider',
}

export const SALON_DEMO_NAV: Record<SalonDemoRole, { roleLabel: string; navItems: NavItem[]; bottomNav: NavItem[] }> = {
  OWNER: {
    roleLabel: 'Salon Owner',
    navItems: [
      { to: '/demo/salon/owner', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/demo/salon/owner/providers', label: 'Providers', icon: Scissors },
      { to: '/demo/salon/owner/reports', label: 'Reports', icon: BarChart3 },
    ],
    bottomNav: [
      { to: '/demo/salon/owner', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/demo/salon/owner/providers', label: 'Providers', icon: Scissors },
      { to: '/demo/salon/owner/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  RECEPTION: {
    roleLabel: 'Receptionist',
    navItems: [
      { to: '/demo/salon/reception', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/demo/salon/reception/register', label: 'Register client', icon: UserPlus },
      { to: '/demo/salon/reception/checkout', label: 'Checkout', icon: ShoppingBag },
    ],
    bottomNav: [
      { to: '/demo/salon/reception', label: 'Home', icon: LayoutDashboard, end: true },
      { to: '/demo/salon/reception/register', label: 'Register', icon: UserPlus },
      { to: '/demo/salon/reception/checkout', label: 'Checkout', icon: ShoppingBag },
    ],
  },
  PROVIDER: {
    roleLabel: 'Service Provider',
    navItems: [{ to: '/demo/salon/provider', label: 'My clients', icon: Users, end: true }],
    bottomNav: [{ to: '/demo/salon/provider', label: 'My clients', icon: Users, end: true }],
  },
}
