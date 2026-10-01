import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui/LoadingScreen'

import { AdminLayout } from './components/layouts/AdminLayout'
import { CaretakerLayout } from './components/layouts/CaretakerLayout'
import { GuardLayout } from './components/layouts/GuardLayout'
import { PropertyManagerLayout } from './components/layouts/PropertyManagerLayout'
import { SalonOwnerLayout } from './components/layouts/SalonOwnerLayout'
import { SalonReceptionistLayout } from './components/layouts/SalonReceptionistLayout'
import { SalonProviderLayout } from './components/layouts/SalonProviderLayout'

import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import SalonsPage from './pages/admin/SalonsPage'
import SalonDetailPage from './pages/admin/SalonDetailPage'
import LeadsPage from './pages/admin/LeadsPage'
import OwnerDashboard from './pages/salon/owner/OwnerDashboard'
import ProvidersPage from './pages/salon/owner/ProvidersPage'
import ReceptionistsPage from './pages/salon/owner/ReceptionistsPage'
import OwnerReportsPage from './pages/salon/owner/OwnerReportsPage'
import OwnerSettingsPage from './pages/salon/owner/OwnerSettingsPage'
import StaffPermissionsPage from './pages/salon/owner/StaffPermissionsPage'
import ReceptionistDashboard from './pages/salon/receptionist/ReceptionistDashboard'
import ClientRegistrationPage from './pages/salon/receptionist/ClientRegistrationPage'
import CheckoutPage from './pages/salon/receptionist/CheckoutPage'
import ProviderDashboard from './pages/salon/provider/ProviderDashboard'
import PropertiesPage from './pages/admin/PropertiesPage'
import PropertyFormPage from './pages/admin/PropertyFormPage'
import PropertyDetailPage from './pages/admin/PropertyDetailPage'
import BlockFormPage from './pages/admin/BlockFormPage'
import StaffPage from './pages/admin/StaffPage'
import SubscriptionsPage from './pages/admin/SubscriptionsPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'
import NotificationsPage from './pages/admin/NotificationsPage'
import AuditLogsPage from './pages/admin/AuditLogsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'

import CaretakerDashboard from './pages/caretaker/CaretakerDashboard'
import VisitorsPage from './features/property/VisitorsPage'
import TenantsPage from './features/property/TenantsPage'
import BlocksUnitsPage from './features/property/BlocksUnitsPage'
import CaretakerDeliveriesPage from './features/property/DeliveriesPage'
import CaretakerIncidentsPage from './features/property/IncidentsPage'
import CaretakerStaffPage from './features/property/StaffPage'
import PMSettingsPage from './features/property/PMSettingsPage'
import SecurityTeamPage from './pages/property-manager/SecurityTeamPage'
import ReportsPlaceholder from './features/property/ReportsPlaceholder'
import CaretakerSettingsPage from './pages/caretaker/CaretakerSettingsPage'
import GuardSettingsPage from './pages/gate/GuardSettingsPage'
import GateDashboard from './pages/gate/GateDashboard'
import RegisterGuestPage from './pages/gate/RegisterGuestPage'
import CurrentlyInsidePage from './pages/gate/CurrentlyInsidePage'
import DeliveriesPage from './pages/gate/DeliveriesPage'
import IncidentsPage from './pages/gate/IncidentsPage'
import ReportIncidentPage from './pages/gate/ReportIncidentPage'
import MyShiftPage from './pages/gate/MyShiftPage'
import DemoApp from './demo/DemoApp'
// New feature pages
import ExpectedVisitorsPage  from './pages/gate/ExpectedVisitorsPage'
import VehicleLogPage        from './pages/gate/VehicleLogPage'
import PreApprovedPage       from './features/property/PreApprovedPage'
import MaintenancePage       from './features/property/MaintenancePage'
import PaymentsPage          from './features/property/PaymentsPage'
import BlacklistPage         from './features/property/BlacklistPage'
import InspectionsPage       from './pages/caretaker/InspectionsPage'
import LeasePage             from './pages/property-manager/LeasePage'
import ComplaintsPage        from './pages/property-manager/ComplaintsPage'
import TenantPortalPage      from './pages/property-manager/TenantPortalPage'

import type { UserRole } from './types'

function roleHome(user: { role: UserRole | null; salonId: string | null }): string {
  switch (user.role) {
    case 'SUPER_ADMIN':         return '/admin'
    case 'PROPERTY_MANAGER':    return '/property'
    case 'CARETAKER':           return '/caretaker'
    case 'SECURITY_GUARD':      return '/gate'
    case 'SALON_OWNER':         return user.salonId ? `/salon/${user.salonId}/owner` : '/login'
    case 'SALON_RECEPTIONIST':  return user.salonId ? `/salon/${user.salonId}/receptionist` : '/login'
    case 'SALON_PROVIDER':      return user.salonId ? `/salon/${user.salonId}/provider` : '/login'
    default:                    return '/login'
  }
}

function RootRedirect() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to={roleHome(user)} replace />
  // Only the marketing page lives at "/"; unknown deep paths go to login.
  if (location.pathname !== '/') return <Navigate to="/login" replace />
  return <LandingPage />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />
      <Route path="/demo/*" element={<DemoApp />} />

      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AdminLayout /></ProtectedRoute>}
      >
        <Route index element={<AdminDashboard />} />
        <Route path="salons" element={<SalonsPage />} />
        <Route path="salons/:id" element={<SalonDetailPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/new" element={<PropertyFormPage />} />
        <Route path="properties/:id" element={<PropertyDetailPage />} />
        <Route path="properties/:id/edit" element={<PropertyFormPage />} />
        <Route path="properties/:id/blocks/new" element={<BlockFormPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="staff/new" element={<StaffPage />} />
        <Route path="subscriptions" element={<SubscriptionsPage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route
        path="/property"
        element={<ProtectedRoute allowedRoles={['PROPERTY_MANAGER']}><PropertyManagerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="units" element={<BlocksUnitsPage />} />
        <Route path="deliveries" element={<CaretakerDeliveriesPage />} />
        <Route path="incidents" element={<CaretakerIncidentsPage />} />
        <Route path="staff" element={<CaretakerStaffPage />} />
        <Route path="reports" element={<ReportsPlaceholder />} />
        <Route path="settings" element={<PMSettingsPage />} />
        <Route path="security-team" element={<SecurityTeamPage />} />
        <Route path="pre-approved" element={<PreApprovedPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="financials" element={<PaymentsPage />} />
        <Route path="blacklist" element={<BlacklistPage />} />
        <Route path="leases" element={<LeasePage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="tenant-portal" element={<TenantPortalPage />} />
      </Route>

      <Route
        path="/caretaker"
        element={<ProtectedRoute allowedRoles={['CARETAKER']}><CaretakerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
        <Route path="register" element={<RegisterGuestPage />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="blocks" element={<BlocksUnitsPage />} />
        <Route path="deliveries" element={<CaretakerDeliveriesPage />} />
        <Route path="incidents" element={<CaretakerIncidentsPage />} />
        <Route path="staff" element={<CaretakerStaffPage />} />
        <Route path="reports" element={<ReportsPlaceholder />} />
        <Route path="settings" element={<CaretakerSettingsPage />} />
        <Route path="pre-approved" element={<PreApprovedPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
      </Route>

      <Route
        path="/gate"
        element={<ProtectedRoute allowedRoles={['SECURITY_GUARD']}><GuardLayout /></ProtectedRoute>}
      >
        <Route index element={<GateDashboard />} />
        <Route path="register" element={<RegisterGuestPage />} />
        <Route path="inside" element={<CurrentlyInsidePage />} />
        <Route path="deliveries" element={<DeliveriesPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/new" element={<ReportIncidentPage />} />
        <Route path="shift" element={<MyShiftPage />} />
        <Route path="settings" element={<GuardSettingsPage />} />
        <Route path="expected" element={<ExpectedVisitorsPage />} />
        <Route path="vehicles" element={<VehicleLogPage />} />
        <Route path="pre-approved" element={<PreApprovedPage />} />
      </Route>

      {/* Salon landing merged into main page */}
      <Route path="/salon" element={<Navigate to="/" replace />} />

      {/* Salon Owner */}
      <Route
        path="/salon/:salonId/owner"
        element={<ProtectedRoute allowedRoles={['SALON_OWNER', 'SUPER_ADMIN']}><SalonOwnerLayout /></ProtectedRoute>}
      >
        <Route index element={<OwnerDashboard />} />
        <Route path="providers"          element={<ProvidersPage />} />
        <Route path="receptionists"      element={<ReceptionistsPage />} />
        <Route path="staff-permissions"  element={<StaffPermissionsPage />} />
        <Route path="reports"            element={<OwnerReportsPage />} />
        <Route path="settings"           element={<OwnerSettingsPage />} />
      </Route>

      {/* Salon Receptionist */}
      <Route
        path="/salon/:salonId/receptionist"
        element={<ProtectedRoute allowedRoles={['SALON_RECEPTIONIST', 'SALON_OWNER', 'SUPER_ADMIN']}><SalonReceptionistLayout /></ProtectedRoute>}
      >
        <Route index element={<ReceptionistDashboard />} />
        <Route path="clients"  element={<ClientRegistrationPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
      </Route>

      {/* Salon Provider */}
      <Route
        path="/salon/:salonId/provider"
        element={<ProtectedRoute allowedRoles={['SALON_PROVIDER', 'SUPER_ADMIN']}><SalonProviderLayout /></ProtectedRoute>}
      >
        <Route index element={<ProviderDashboard />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
