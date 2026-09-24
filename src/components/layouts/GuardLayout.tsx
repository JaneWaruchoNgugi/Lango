import { Home, UserPlus, Package, Users, AlertTriangle, Clock, Settings, CalendarCheck, Car, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppShell } from './AppShell'
import { ShiftSetupGate } from './ShiftSetupGate'
import { PageLoader } from '../ui/LoadingScreen'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'

export function GuardLayout() {
  const { user } = useAuth()
  const { shift, loading } = useShift(user?.uid, user?.propertyId)
  const { t } = useTranslation()

  const NAV = [
    { to: '/gate', label: t('nav.home'), icon: Home, end: true },
    { to: '/gate/register', label: t('nav.registerVisitor'), icon: UserPlus },
    { to: '/gate/deliveries', label: t('nav.deliveries'), icon: Package },
    { to: '/gate/inside', label: t('nav.currentlyInside'), icon: Users },
    { to: '/gate/shift', label: t('nav.myShift'), icon: Clock },
    { to: '/gate/incidents', label: t('nav.reportIncident'), icon: AlertTriangle },
    { to: '/gate/expected', label: t('nav.expectedToday'), icon: CalendarCheck },
    { to: '/gate/vehicles', label: t('nav.vehicleLog'), icon: Car },
    { to: '/gate/pre-approved', label: t('nav.preApproved'), icon: ShieldCheck },
  ]

  const BOTTOM = [
    { to: '/gate', label: t('nav.home'), icon: Home, end: true },
    { to: '/gate/deliveries', label: t('nav.deliveries'), icon: Package },
    { to: '/gate/inside', label: 'Inside', icon: Users },
    { to: '/gate/shift', label: t('nav.myShift'), icon: Clock },
    { to: '/gate/settings', label: t('nav.settings'), icon: Settings },
  ]

  if (loading) return <PageLoader />
  if (!shift) return <ShiftSetupGate />

  return (
    <AppShell navItems={NAV} bottomNav={BOTTOM} roleLabel="Security Guard" settingsTo="/gate/settings" />
  )
}
