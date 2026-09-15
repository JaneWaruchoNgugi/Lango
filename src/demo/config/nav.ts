import { LayoutDashboard, Users, Home, Package, ShieldCheck, Clock, UserPlus, DoorOpen, Building2, type LucideIcon } from 'lucide-react'
import type { NavItem } from '../../components/layouts/AppShell'
import type { DemoRole } from '../data/types'

export interface DemoNav { roleLabel: string; navItems: NavItem[]; bottomNav: NavItem[] }

const icon = (i: LucideIcon) => i

export const DEMO_NAV: Record<DemoRole, DemoNav> = {
  MANAGER: {
    roleLabel: 'Property Manager',
    navItems: [
      { to: '/demo/manager', label: 'Dashboard', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/manager/visitors', label: 'Visitors', icon: icon(Users) },
      { to: '/demo/manager/tenants', label: 'Tenants', icon: icon(Home) },
      { to: '/demo/manager/units', label: 'Blocks & Units', icon: icon(Building2) },
      { to: '/demo/manager/deliveries', label: 'Deliveries', icon: icon(Package) },
      { to: '/demo/manager/incidents', label: 'Incidents', icon: icon(ShieldCheck) },
      { to: '/demo/manager/staff', label: 'Staff', icon: icon(Users) },
    ],
    bottomNav: [
      { to: '/demo/manager', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/manager/visitors', label: 'Visitors', icon: icon(Users) },
      { to: '/demo/manager/deliveries', label: 'Deliveries', icon: icon(Package) },
    ],
  },
  GUARD: {
    roleLabel: 'Security Guard',
    navItems: [
      { to: '/demo/guard', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/guard/register', label: 'Register Visitor', icon: icon(UserPlus) },
      { to: '/demo/guard/inside', label: 'Currently Inside', icon: icon(DoorOpen) },
      { to: '/demo/guard/shift', label: 'My Shift', icon: icon(Clock) },
    ],
    bottomNav: [
      { to: '/demo/guard', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/guard/inside', label: 'Inside', icon: icon(DoorOpen) },
      { to: '/demo/guard/shift', label: 'Shift', icon: icon(Clock) },
    ],
  },
  CARETAKER: {
    roleLabel: 'Caretaker',
    navItems: [
      { to: '/demo/caretaker', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/caretaker/register', label: 'Register Visitor', icon: icon(UserPlus) },
      { to: '/demo/caretaker/inside', label: 'Currently Inside', icon: icon(DoorOpen) },
    ],
    bottomNav: [
      { to: '/demo/caretaker', label: 'Home', icon: icon(LayoutDashboard), end: true },
      { to: '/demo/caretaker/inside', label: 'Inside', icon: icon(DoorOpen) },
    ],
  },
}
