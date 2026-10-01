import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, Trash2, RefreshCw, Power } from 'lucide-react'
import { db, functions } from '../../firebase/config'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { Salon, AppUser, SalonProvider, SalonServiceType } from '../../types'
import { SALON_SERVICE_LABELS } from '../../types'

const receptionistSchema = z.object({
  name:     z.string().min(2, 'Name required'),
  phone:    z.string().min(9, 'Valid phone required'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 chars').optional().or(z.literal('')),
})
type ReceptionistForm = z.infer<typeof receptionistSchema>

export default function SalonDetailPage() {
  const { id: salonId } = useParams<{ id: string }>()

  const [salon, setSalon]         = useState<Salon | null>(null)
  const [staff, setStaff]         = useState<AppUser[]>([])
  const [providers, setProviders] = useState<SalonProvider[]>([])
  const [loading, setLoading]     = useState(true)

  const [showModal, setShowModal]   = useState(false)
  const [creating, setCreating]     = useState(false)
  const [tempCred, setTempCred]     = useState<{ name: string; email: string; password: string } | null>(null)
  const [toDelete, setToDelete]     = useState<AppUser | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [resetting, setResetting]   = useState<string | null>(null)

  const [togglingStatus, setTogglingStatus]     = useState(false)
  const [resettingProvider, setResettingProvider] = useState<string | null>(null)
  const [togglingProvider, setTogglingProvider]   = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ReceptionistForm>({
    resolver: zodResolver(receptionistSchema),
  })

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr   = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('password', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  const load = async () => {
    if (!salonId) return
    try {
      const [salonSnap, staffSnap, provSnap] = await Promise.all([
        getDoc(doc(db, 'salons', salonId)),
        getDocs(query(collection(db, 'users'), where('salonId', '==', salonId))),
        getDocs(query(collection(db, 'salonProviders'), where('salonId', '==', salonId))),
      ])
      if (salonSnap.exists()) setSalon(salonSnap.data() as Salon)
      setStaff(staffSnap.docs.map(d => d.data() as AppUser))
      setProviders(provSnap.docs.map(d => d.data() as SalonProvider).sort((a, b) => a.providerCode.localeCompare(b.providerCode)))
    } catch (err) {
      console.error(err)
      toast.error('Failed to load salon')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [salonId])

  const handleToggleSalonStatus = async () => {
    if (!salon || !salonId) return
    const newStatus = salon.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setTogglingStatus(true)
    try {
      const fn = httpsCallable(functions, 'updateSalon')
      await fn({ salonId, status: newStatus })
      setSalon(prev => prev ? { ...prev, status: newStatus } : prev)
      toast.success(`Salon ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update status')
    } finally {
      setTogglingStatus(false)
    }
  }

  const onCreateReceptionist = async (data: ReceptionistForm) => {
    setCreating(true)
    try {
      const fn  = httpsCallable<unknown, { uid: string; tempPassword: string }>(functions, 'createSalonStaff')
      const res = await fn({
        salonId, role: 'SALON_RECEPTIONIST',
        name: data.name, phone: data.phone, email: data.email,
        password: data.password || undefined,
      })
      setTempCred({ name: data.name, email: data.email, password: res.data.tempPassword })
      await load()
      reset()
      setShowModal(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create receptionist')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const fn = httpsCallable(functions, 'deleteSalonStaff')
      await fn({ uid: toDelete.uid })
      toast.success('Staff member removed')
      setToDelete(null)
      await load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async (uid: string, name: string) => {
    setResetting(uid)
    try {
      const fn  = httpsCallable<unknown, { tempPassword: string }>(functions, 'resetSalonStaffPassword')
      const res = await fn({ uid })
      toast.success(`New password for ${name}: ${res.data.tempPassword}`, { duration: 10000 })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reset')
    } finally {
      setResetting(null)
    }
  }

  const handleResetProviderPassword = async (uid: string, name: string) => {
    setResettingProvider(uid)
    try {
      const fn  = httpsCallable<unknown, { tempPassword: string }>(functions, 'resetSalonStaffPassword')
      const res = await fn({ uid })
      toast.success(`New password for ${name}: ${res.data.tempPassword}`, { duration: 10000 })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reset')
    } finally {
      setResettingProvider(null)
    }
  }

  const handleToggleProviderStatus = async (p: SalonProvider) => {
    setTogglingProvider(p.providerId)
    try {
      const fn        = httpsCallable(functions, 'updateSalonProviderServices')
      const newStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await fn({ uid: p.providerId, status: newStatus })
      setProviders(prev => prev.map(x => x.providerId === p.providerId ? { ...x, status: newStatus } : x))
      toast.success(`${p.name} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update')
    } finally {
      setTogglingProvider(null)
    }
  }

  if (loading) return <PageLoader />
  if (!salon)  return <div className="p-6 text-gray-500">Salon not found.</div>

  const receptionists = staff.filter(u => u.role === 'SALON_RECEPTIONIST')
  const owners        = staff.filter(u => u.role === 'SALON_OWNER')

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/admin/salons" className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></Link>
        <div>
          <h1 className="page-title">{salon.name}</h1>
          <p className="page-subtitle">{salon.location} · {salon.initials}</p>
        </div>
      </div>

      {tempCred && (
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-1">Receptionist created</p>
          <p className="text-xs text-green-700">Email: <strong>{tempCred.email}</strong></p>
          <p className="text-xs text-green-700">Temp password: <strong className="font-mono">{tempCred.password}</strong></p>
          <button onClick={() => setTempCred(null)} className="text-xs text-green-600 underline mt-2">Dismiss</button>
        </div>
      )}

      {/* Salon Info */}
      <div className="card p-5">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-gray-500 text-xs">Phone</p><p className="font-medium">{salon.phone}</p></div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Status</p>
            <div className="flex items-center gap-2">
              <span className={`badge ${salon.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{salon.status}</span>
              <button onClick={handleToggleSalonStatus} disabled={togglingStatus}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${salon.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                <Power className="w-3 h-3" />
                {togglingStatus ? '...' : salon.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
          <div><p className="text-gray-500 text-xs">Owner</p><p className="font-medium">{salon.ownerName}</p></div>
          <div><p className="text-gray-500 text-xs">Owner Email</p><p className="font-medium">{salon.ownerEmail}</p></div>
          <div><p className="text-gray-500 text-xs">Owner Phone</p><p className="font-medium">{salon.ownerPhone}</p></div>
          <div><p className="text-gray-500 text-xs">Providers Created</p><p className="font-medium">{salon.providerCount}</p></div>
        </div>
      </div>

      {/* Owner accounts */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Owner Accounts ({owners.length})</h3>
        </div>
        {owners.length === 0 ? (
          <EmptyState title="No owner accounts" description="Owner account is created when the salon is registered." />
        ) : owners.map(u => (
          <div key={u.uid} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email} · {u.phone}</p>
            </div>
            <button onClick={() => handleResetPassword(u.uid, u.name)} disabled={resetting === u.uid}
              className="btn-secondary text-xs">
              <RefreshCw className="w-3 h-3" /> {resetting === u.uid ? 'Resetting...' : 'Reset PW'}
            </button>
          </div>
        ))}
      </div>

      {/* Receptionists */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="section-title mb-0">Receptionists ({receptionists.length})</h3>
          <button onClick={() => setShowModal(true)} className="btn-primary text-xs">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        {receptionists.length === 0 ? (
          <EmptyState title="No receptionists" description="Add a receptionist to this salon." />
        ) : receptionists.map(u => (
          <div key={u.uid} className="px-5 py-3 flex items-center justify-between border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{u.name}</p>
              <p className="text-xs text-gray-500">{u.email} · {u.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleResetPassword(u.uid, u.name)} disabled={resetting === u.uid}
                className="btn-secondary text-xs">
                <RefreshCw className="w-3 h-3" /> {resetting === u.uid ? 'Resetting...' : 'Reset PW'}
              </button>
              <button onClick={() => setToDelete(u)} className="btn-ghost text-xs text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Providers */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Service Providers ({providers.length})</h3>
        </div>
        {providers.length === 0 ? (
          <EmptyState title="No providers" description="Providers are added by the salon owner." />
        ) : providers.map(p => (
          <div key={p.providerId} className="px-5 py-4 flex items-start justify-between gap-4 border-b border-gray-50 last:border-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <span className="font-mono text-xs bg-lango-light text-lango-primary px-1.5 py-0.5 rounded">{p.providerCode}</span>
                <span className={`badge ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{p.phone}{p.idNumber ? ` · ID: ${p.idNumber}` : ''}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {p.services.map(s => (
                  <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                    {SALON_SERVICE_LABELS[s as SalonServiceType]}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => handleResetProviderPassword(p.providerId, p.name)}
                disabled={resettingProvider === p.providerId} className="btn-secondary text-xs">
                <RefreshCw className="w-3 h-3" /> {resettingProvider === p.providerId ? '...' : 'Reset PW'}
              </button>
              <button onClick={() => handleToggleProviderStatus(p)}
                disabled={togglingProvider === p.providerId} className="btn-ghost text-xs">
                {togglingProvider === p.providerId ? '...' : p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Receptionist Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Receptionist" size="md"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="rec-form" type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Account'}
            </button>
          </>
        }
      >
        <form id="rec-form" onSubmit={handleSubmit(onCreateReceptionist)} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input {...register('name')} className="input" placeholder="Full name" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input {...register('phone')} className="input" placeholder="+254..." />
            {errors.phone && <p className="form-error">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Email (login)</label>
            <input {...register('email')} className="input" type="email" placeholder="receptionist@email.com" />
            {errors.email && <p className="form-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Temporary Password</label>
            <div className="flex gap-2">
              <input {...register('password')} className="input" placeholder="Leave blank to auto-generate" />
              <button type="button" onClick={suggestPassword} className="btn-secondary text-xs whitespace-nowrap">Generate</button>
            </div>
            {errors.password && <p className="form-error">{errors.password.message}</p>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete} onClose={() => setToDelete(null)} onConfirm={handleDelete}
        title="Remove Staff Member"
        message={`Remove ${toDelete?.name}? This deletes their login account.`}
        confirmLabel="Remove" variant="danger" loading={deleting}
      />
    </div>
  )
}
