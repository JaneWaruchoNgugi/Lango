import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types'
import { LoadingScreen } from './ui/LoadingScreen'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    // User is authenticated but doesn't have the right role
    // Redirect them to their correct dashboard
    return <Navigate to={getRoleDashboard(user.role)} replace />
  }

  return <>{children}</>
}

function getRoleDashboard(role: UserRole | null): string {
  switch (role) {
    case 'SUPER_ADMIN':      return '/admin'
    case 'PROPERTY_MANAGER': return '/property'
    case 'CARETAKER':        return '/caretaker'
    case 'SECURITY_GUARD':   return '/gate'
    default:                 return '/login'
  }
}
