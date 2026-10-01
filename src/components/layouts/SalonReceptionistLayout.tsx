import { LayoutDashboard, UserPlus, ShoppingBag } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { AppShell, type NavItem } from './AppShell'

export function SalonReceptionistLayout() {
  const { salonId } = useParams<{ salonId: string }>()
  const base = `/salon/${salonId}/receptionist`

  const NAV: NavItem[] = [
    { to: base,                 label: 'Dashboard',  icon: LayoutDashboard, end: true },
    { to: `${base}/clients`,    label: 'Clients',    icon: UserPlus },
    { to: `${base}/checkout`,   label: 'Checkout',   icon: ShoppingBag },
  ]

  const BOTTOM: NavItem[] = [
    { to: base,                 label: 'Home',       icon: LayoutDashboard, end: true },
    { to: `${base}/clients`,    label: 'Clients',    icon: UserPlus },
    { to: `${base}/checkout`,   label: 'Checkout',   icon: ShoppingBag },
  ]

  return (
    <AppShell
      navItems={NAV}
      bottomNav={BOTTOM}
      roleLabel="Receptionist"
    />
  )
}
