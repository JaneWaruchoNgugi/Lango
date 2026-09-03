import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui/LoadingScreen'

import { AdminLayout } from './components/layouts/AdminLayout'
import { CaretakerLayout } from './components/layouts/CaretakerLayout'
import { GuardLayout } from './components/layouts/GuardLayout'
import { PropertyManagerLayout } from './components/layouts/PropertyManagerLayout'

import LoginPage from './pages/auth/LoginPage'
import ChangePasswordPage from './pages/auth/ChangePasswordPage'

import AdminDashboard from './pages/admin/AdminDashboard'
import PropertiesPage from './pages/admin/PropertiesPage'
import PropertyFormPage from './pages/admin/PropertyFormPage'
import PropertyDetailPage from './pages/admin/PropertyDetailPage'
import BlockFormPage from './pages/admin/BlockFormPage'
import StaffPage from './pages/admin/StaffPage'

import CaretakerDashboard from './pages/caretaker/CaretakerDashboard'
import GateDashboard from './pages/gate/GateDashboard'
import RegisterVisitorPage from './pages/gate/RegisterVisitorPage'

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
  if (loading) return <LoadingScreen />
  return <Navigate to={user ? roleHome(user.role) : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/change-password" element={<ChangePasswordPage />} />

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
      </Route>

      <Route
        path="/property"
        element={<ProtectedRoute allowedRoles={['PROPERTY_MANAGER']}><PropertyManagerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
      </Route>

      <Route
        path="/caretaker"
        element={<ProtectedRoute allowedRoles={['CARETAKER']}><CaretakerLayout /></ProtectedRoute>}
      >
        <Route index element={<CaretakerDashboard />} />
      </Route>

      <Route
        path="/gate"
        element={<ProtectedRoute allowedRoles={['SECURITY_GUARD']}><GuardLayout /></ProtectedRoute>}
      >
        <Route index element={<GateDashboard />} />
        <Route path="register-visitor" element={<RegisterVisitorPage />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}
