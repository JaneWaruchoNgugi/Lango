import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Toggle } from '../../../components/ui/Toggle'
import toast from 'react-hot-toast'
import { Shield, ChevronRight, Clock } from 'lucide-react'
import { format } from 'date-fns'
import type { AppUser, SalonStaffPermissions, SalonPermissionKey, SalonDataVisibility, UserRole } from '../../../types'
import { PROVIDER_DEFAULT_PERMISSIONS, RECEPTIONIST_DEFAULT_PERMISSIONS } from '../../../types'

type PermFlags = Omit<SalonStaffPermissions, 'uid' | 'salonId' | 'staffName' | 'role' | 'updatedAt' | 'updatedBy' | 'updatedByName'>

interface PermGroup {
  label: string
  keys: SalonPermissionKey[]
}

const PERM_GROUPS: PermGroup[] = [
  {
    label: 'Client Data',
    keys: ['viewClientName', 'viewServiceHistory', 'viewAllergiesNotes', 'viewPhone', 'viewEmail', 'viewAddress', 'createClients', 'editClients', 'deleteClients'],
  },
  {
    label: 'Bookings',
    keys: ['createBookings', 'editBookings', 'cancelBookings', 'completeBookings'],
  },
  {
    label: 'Financial',
    keys: ['viewPrices', 'viewPayments', 'viewRevenue', 'viewReports'],
  },
  {
    label: 'Staff & Management',
    keys: ['manageStaff', 'manageProviders', 'manageBranches', 'manageServices', 'manageMarketing', 'deleteRecords'],
  },
]

const PERM_LABELS: Record<SalonPermissionKey, string> = {
  viewClientName:     'View client name',
  viewServiceHistory: 'View service history',
  viewAllergiesNotes: 'View allergies & notes',
  viewPhone:          'View phone number',
  viewEmail:          'View email address',
  viewAddress:        'View physical address',
  createClients:      'Create clients',
  editClients:        'Edit client records',
  deleteClients:      'Delete clients',
  createBookings:     'Create bookings',
  editBookings:       'Edit bookings',
  cancelBookings:     'Cancel bookings',
  completeBookings:   'Mark bookings complete',
  viewPrices:         'View service prices',
  viewPayments:       'View & process payments',
  viewRevenue:        'View revenue totals',
  viewReports:        'View financial reports',
  manageStaff:        'Manage staff accounts',
  manageProviders:    'Manage providers',
  manageBranches:     'Manage branches',
  manageServices:     'Manage service catalogue',
  manageMarketing:    'Manage marketing',
  deleteRecords:      'Delete records',
}

const VISIBILITY_LABELS: Record<SalonDataVisibility, string> = {
  OWN_CLIENTS:    'Own clients only',
  BRANCH_CLIENTS: 'Assigned branch clients',
  ALL_CLIENTS:    'All salon clients',
}

function defaultFlags(role: UserRole): PermFlags {
  if (role === 'SALON_PROVIDER')     return { ...PROVIDER_DEFAULT_PERMISSIONS }
  if (role === 'SALON_RECEPTIONIST') return { ...RECEPTIONIST_DEFAULT_PERMISSIONS }
  return { ...RECEPTIONIST_DEFAULT_PERMISSIONS }
}

export default function StaffPermissionsPage() {
  const { salonId }  = useParams<{ salonId: string }>()
  const { user }     = useAuth()

  const [staff, setStaff]           = useState<AppUser[]>([])
  const [selected, setSelected]     = useState<AppUser | null>(null)
  const [flags, setFlags]           = useState<PermFlags | null>(null)
  const [permsMeta, setPermsMeta]   = useState<{ updatedAt?: any; updatedByName?: string } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [loadingPerms, setLoadingPerms] = useState(false)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    if (!salonId) return
    getDocs(query(
      collection(db, 'users'),
      where('salonId', '==', salonId),
    )).then(snap => {
      const members = snap.docs
        .map(d => d.data() as AppUser)
        .filter(u => u.role === 'SALON_RECEPTIONIST' || u.role === 'SALON_PROVIDER')
        .sort((a, b) => a.name.localeCompare(b.name))
      setStaff(members)
    }).catch(console.error).finally(() => setLoading(false))
  }, [salonId])

  const selectStaff = async (member: AppUser) => {
    setSelected(member)
    setLoadingPerms(true)
    try {
      const snap = await getDoc(doc(db, 'salonStaffPermissions', member.uid))
      if (snap.exists()) {
        const data = snap.data() as SalonStaffPermissions
        setFlags({
          isActive:           data.isActive ?? true,
          viewClientName:     data.viewClientName,
          viewServiceHistory: data.viewServiceHistory,
          viewAllergiesNotes: data.viewAllergiesNotes,
          viewPhone:          data.viewPhone,
          viewEmail:          data.viewEmail,
          viewAddress:        data.viewAddress,
          createClients:      data.createClients,
          editClients:        data.editClients,
          deleteClients:      data.deleteClients,
          createBookings:     data.createBookings,
          editBookings:       data.editBookings,
          cancelBookings:     data.cancelBookings,
          completeBookings:   data.completeBookings,
          viewPrices:         data.viewPrices,
          viewPayments:       data.viewPayments,
          viewRevenue:        data.viewRevenue,
          viewReports:        data.viewReports,
          manageStaff:        data.manageStaff,
          manageProviders:    data.manageProviders,
          manageBranches:     data.manageBranches,
          manageServices:     data.manageServices,
          manageMarketing:    data.manageMarketing,
          deleteRecords:      data.deleteRecords,
          dataVisibility:     data.dataVisibility ?? 'OWN_CLIENTS',
        })
        setPermsMeta({ updatedAt: data.updatedAt, updatedByName: data.updatedByName })
      } else {
        setFlags(defaultFlags(member.role))
        setPermsMeta(null)
      }
    } catch {
      toast.error('Failed to load permissions')
    } finally {
      setLoadingPerms(false)
    }
  }

  const toggle = (key: SalonPermissionKey) =>
    setFlags(prev => prev ? { ...prev, [key]: !prev[key] } : prev)

  const setVisibility = (v: SalonDataVisibility) =>
    setFlags(prev => prev ? { ...prev, dataVisibility: v } : prev)

  const save = async () => {
    if (!selected || !flags || !salonId) return
    setSaving(true)
    try {
      const fn = httpsCallable(functions, 'setSalonStaffPermissions')
      await fn({ targetUid: selected.uid, permissions: { ...flags } })
      toast.success(`Permissions updated for ${selected.name}`)
      setPermsMeta({ updatedAt: null, updatedByName: user?.profile?.name ?? 'You' })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Staff Permissions</h1>
        <p className="page-subtitle">Configure individual access for each staff member</p>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-5 items-start">
        {/* Staff list */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Staff ({staff.length})</p>
          </div>
          {staff.length === 0 ? (
            <EmptyState icon={Shield} title="No staff" description="Add providers or receptionists first." />
          ) : (
            <div className="divide-y divide-gray-50">
              {staff.map(m => (
                <button
                  key={m.uid}
                  onClick={() => selectStaff(m)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors ${selected?.uid === m.uid ? 'bg-lango-light' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{m.role === 'SALON_PROVIDER' ? 'Provider' : 'Receptionist'}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 ${selected?.uid === m.uid ? 'text-lango-primary' : 'text-gray-300'}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Permission panel */}
        <div>
          {!selected ? (
            <div className="card p-8 text-center">
              <Shield className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a staff member to configure their permissions</p>
            </div>
          ) : loadingPerms ? (
            <PageLoader />
          ) : flags ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="card px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold text-gray-900">{selected.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.role === 'SALON_PROVIDER' ? 'Service Provider' : 'Receptionist'} · {selected.email}</p>
                  {permsMeta?.updatedByName && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Last updated by {permsMeta.updatedByName}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <Toggle
                      checked={flags.isActive}
                      onChange={v => setFlags(prev => prev ? { ...prev, isActive: v } : prev)}
                    />
                    Active
                  </label>
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>
              </div>

              {/* Data visibility */}
              <div className="card px-5 py-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Data Visibility</p>
                <div className="flex flex-wrap gap-2">
                  {(['OWN_CLIENTS', 'BRANCH_CLIENTS', 'ALL_CLIENTS'] as SalonDataVisibility[]).map(v => (
                    <button
                      key={v}
                      onClick={() => setVisibility(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${flags.dataVisibility === v ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-lango-primary/30'}`}
                    >
                      {VISIBILITY_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permission groups */}
              {PERM_GROUPS.map(group => (
                <div key={group.label} className="card px-5 py-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{group.label}</p>
                  <div className="space-y-3">
                    {group.keys.map(key => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{PERM_LABELS[key]}</span>
                        <Toggle
                          checked={!!flags[key as keyof PermFlags]}
                          onChange={() => toggle(key)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <button onClick={save} disabled={saving} className="btn-primary">
                  {saving ? 'Saving…' : 'Save Permissions'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
