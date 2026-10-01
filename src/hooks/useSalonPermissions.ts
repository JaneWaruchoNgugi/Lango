import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { useAuth } from '../contexts/AuthContext'
import type { SalonStaffPermissions, SalonPermissionKey, UserRole } from '../types'
import { PROVIDER_DEFAULT_PERMISSIONS, RECEPTIONIST_DEFAULT_PERMISSIONS } from '../types'

function defaultsForRole(role: UserRole | null): Omit<SalonStaffPermissions, 'uid' | 'salonId' | 'staffName' | 'role' | 'updatedAt' | 'updatedBy' | 'updatedByName'> | null {
  if (role === 'SALON_PROVIDER')      return PROVIDER_DEFAULT_PERMISSIONS
  if (role === 'SALON_RECEPTIONIST')  return RECEPTIONIST_DEFAULT_PERMISSIONS
  if (role === 'SALON_OWNER')         return null // owners have all access
  return null
}

interface PermissionsState {
  perms: SalonStaffPermissions | null
  loading: boolean
  isOwner: boolean
  /** True if no permissions doc exists yet — defaults are applied */
  usingDefaults: boolean
}

export function useSalonPermissions(): PermissionsState {
  const { user }  = useAuth()
  const [state, setState] = useState<PermissionsState>({ perms: null, loading: true, isOwner: false, usingDefaults: false })

  useEffect(() => {
    if (!user) {
      setState({ perms: null, loading: false, isOwner: false, usingDefaults: false })
      return
    }

    if (user.role === 'SALON_OWNER' || user.role === 'SUPER_ADMIN') {
      setState({ perms: null, loading: false, isOwner: true, usingDefaults: false })
      return
    }

    const unsub = onSnapshot(
      doc(db, 'salonStaffPermissions', user.uid),
      snap => {
        if (snap.exists()) {
          setState({ perms: snap.data() as SalonStaffPermissions, loading: false, isOwner: false, usingDefaults: false })
        } else {
          const defaults = defaultsForRole(user.role)
          setState({
            perms: defaults
              ? { uid: user.uid, salonId: user.salonId ?? '', staffName: user.profile?.name ?? '', role: user.role!, updatedAt: null as any, updatedBy: '', updatedByName: '', ...defaults }
              : null,
            loading: false,
            isOwner: false,
            usingDefaults: true,
          })
        }
      },
      () => setState(prev => ({ ...prev, loading: false })),
    )

    return unsub
  }, [user?.uid, user?.role])

  return state
}

/** Convenience — returns true when the current user has a given permission (owners always get true) */
export function useHasPermission(key: SalonPermissionKey): boolean {
  const { perms, isOwner } = useSalonPermissions()
  if (isOwner) return true
  return perms?.[key] === true
}
