import { Home, UserPlus, Package, Users, AlertTriangle, Clock, Settings } from 'lucide-react'
import { AppShell, type NavItem } from './AppShell'
import { ShiftSetupGate } from './ShiftSetupGate'
import { PageLoader } from '../ui/LoadingScreen'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'

const NAV: NavItem[] = [
  { to: '/gate', label: 'Home', icon: Home, end: true },
  { to: '/gate/register', label: 'Register Visitor', icon: UserPlus },
  { to: '/gate/deliveries', label: 'Delivery Check-in', icon: Package },
  { to: '/gate/inside', label: 'Currently Inside', icon: Users },
  { to: '/gate/shift', label: 'My Shift', icon: Clock },
  { to: '/gate/incidents', label: 'Report Incident', icon: AlertTriangle },

]

const BOTTOM: NavItem[] = [
  { to: '/gate', label: 'Home', icon: Home, end: true },
  { to: '/gate/deliveries', label: 'Deliveries', icon: Package },
  { to: '/gate/inside', label: 'Inside', icon: Users },
  { to: '/gate/shift', label: 'My Shift', icon: Clock },
  { to: '/gate/settings', label: 'Settings', icon: Settings },

]

export function GuardLayout() {
  const { user } = useAuth()
  const { shift, loading } = useShift(user?.uid, user?.propertyId)

  if (loading) return <PageLoader />
  if (!shift) return <ShiftSetupGate />

  return (
    <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Security Guard" settingsTo="/gate/settings" />
  )
}
