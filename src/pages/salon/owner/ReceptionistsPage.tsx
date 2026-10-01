import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, RefreshCw } from 'lucide-react'
import { db, functions } from '../../../firebase/config'
import { Modal, ConfirmDialog } from '../../../components/ui/Modal'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { AppUser, Salon } from '../../../types'

const schema = z.object({
  name:     z.string().min(2, 'Name required'),
  phone:    z.string().min(9, 'Valid phone required'),
  email:    z.string().email('Valid email required'),
  password: z.string().min(8, 'At least 8 chars').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function ReceptionistsPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const [staff, setStaff]         = useState<AppUser[]>([])
  const [salon, setSalon]         = useState<Salon | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [tempCred, setTempCred]   = useState<{ name: string; email: string; password: string } | null>(null)
  const [toDelete, setToDelete]   = useState<AppUser | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('password', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  const load = async () => {
    if (!salonId) return
    try {
      const [staffSnap, salonSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('salonId', '==', salonId), where('role', '==', 'SALON_RECEPTIONIST'))),
        getDoc(doc(db, 'salons', salonId)),
      ])
      setStaff(staffSnap.docs.map(d => d.data() as AppUser))
      if (salonSnap.exists()) setSalon(salonSnap.data() as Salon)
    } catch (err) {
      console.error('[Receptionists]', err)
      toast.error('Failed to load receptionists')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [salonId])

  const onSubmit = async (data: FormData) => {
    setCreating(true)
    try {
      const fn = httpsCallable<unknown, { uid: string; tempPassword: string }>(functions, 'createSalonStaff')
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
      toast.success('Receptionist removed')
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
      const fn = httpsCallable<unknown, { tempPassword: string }>(functions, 'resetSalonStaffPassword')
      const res = await fn({ uid })
      toast.success(`New password for ${name}: ${res.data.tempPassword}`, { duration: 10000 })
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to reset')
    } finally {
      setResetting(null)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Receptionists</h1>
          <p className="page-subtitle">{salon?.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Receptionist
        </button>
      </div>

      {tempCred && (
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-800">Receptionist account created</p>
          <p className="text-xs text-green-700 mt-1">Email: <strong>{tempCred.email}</strong></p>
          <p className="text-xs text-green-700">Temp password: <strong className="font-mono">{tempCred.password}</strong></p>
          <button onClick={() => setTempCred(null)} className="text-xs text-green-600 underline mt-2">Dismiss</button>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Receptionists ({staff.length})</h3>
        </div>
        {staff.length === 0 ? (
          <EmptyState title="No receptionists" description="Add a receptionist to handle client registration." />
        ) : (
          <div className="divide-y divide-gray-50">
            {staff.map(u => (
              <div key={u.uid} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email} · {u.phone}</p>
                  <span className={`badge ${u.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'} mt-1`}>{u.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleResetPassword(u.uid, u.name)} disabled={resetting === u.uid}
                    className="btn-secondary text-xs">
                    <RefreshCw className="w-3 h-3" /> {resetting === u.uid ? '...' : 'Reset PW'}
                  </button>
                  <button onClick={() => setToDelete(u)} className="btn-ghost text-xs text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
        <form id="rec-form" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Full Name</label>
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
            <input {...register('email')} className="input" type="email" />
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
        title="Remove Receptionist"
        message={`Remove ${toDelete?.name}? This deletes their login account.`}
        confirmLabel="Remove" variant="danger" loading={deleting}
      />
    </div>
  )
}
