import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui/LoadingScreen'

import { AdminLayout } from './components/layouts/AdminLayout'
import { CaretakerLayout } from './components/layouts/CaretakerLayout'
import { GuardLayout } from './components/layouts/GuardLayout'
import { PropertyManagerLayout } from './components/layouts/PropertyManagerLayout'

import LandingPage from './pages/landing/LandingPage'
import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import LeadsPage from './pages/admin/LeadsPage'
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
import SettingsPage from './features/property/SettingsPage'
import ReportsPlaceholder from './features/property/ReportsPlaceholder'
import GateDashboard from './pages/gate/GateDashboard'
import RegisterGuestPage from './pages/gate/RegisterGuestPage'
import CurrentlyInsidePage from './pages/gate/CurrentlyInsidePage'
import DeliveriesPage from './pages/gate/DeliveriesPage'
import IncidentsPage from './pages/gate/IncidentsPage'
import ReportIncidentPage from './pages/gate/ReportIncidentPage'
import MyShiftPage from './pages/gate/MyShiftPage'
import DemoApp from './demo/DemoApp'

import type { UserRole } from './types'

function roleHome(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}

function RootRedirect() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to={roleHome(user.role)} replace />
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
        <Route path="register" element={<RegisterGuestPage />} />
        <Route path="visitors" element={<VisitorsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="units" element={<BlocksUnitsPage />} />
        <Route path="deliveries" element={<CaretakerDeliveriesPage />} />
        <Route path="incidents" element={<CaretakerIncidentsPage />} />
        <Route path="staff" element={<CaretakerStaffPage />} />
        <Route path="reports" element={<ReportsPlaceholder />} />
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
        <Route path="settings" element={<SettingsPage />} />
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
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
