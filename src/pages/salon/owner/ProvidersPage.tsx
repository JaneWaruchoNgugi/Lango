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
import type { SalonProvider, SalonServiceType, Salon } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

const ALL_SERVICES = Object.entries(SALON_SERVICE_LABELS) as [SalonServiceType, string][]

const schema = z.object({
  name:     z.string().min(2, 'Name required'),
  phone:    z.string().min(9, 'Valid phone required'),
  idNumber: z.string().optional(),
  services: z.array(z.string()).min(1, 'Select at least one service'),
  password: z.string().min(8, 'At least 8 chars').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function ProvidersPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const [providers, setProviders] = useState<SalonProvider[]>([])
  const [salon, setSalon]         = useState<Salon | null>(null)
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [tempCred, setTempCred]   = useState<{ name: string; code: string; password: string } | null>(null)
  const [toDelete, setToDelete]   = useState<SalonProvider | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [resetting, setResetting] = useState<string | null>(null)
  const [saving, setSaving]       = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { services: [] },
  })
  const selectedServices = watch('services') ?? []

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('password', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  const load = async () => {
    if (!salonId) return
    try {
      const [pSnap, sSnap] = await Promise.all([
        getDocs(query(collection(db, 'salonProviders'), where('salonId', '==', salonId))),
        getDoc(doc(db, 'salons', salonId)),
      ])
      setProviders(pSnap.docs.map(d => d.data() as SalonProvider).sort((a, b) => a.providerCode.localeCompare(b.providerCode)))
      if (sSnap.exists()) setSalon(sSnap.data() as Salon)
    } catch (err) {
      console.error('[Providers]', err)
      toast.error('Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [salonId])

  const onSubmit = async (data: FormData) => {
    setCreating(true)
    try {
      const fn = httpsCallable<unknown, { uid: string; tempPassword: string; providerCode: string }>(functions, 'createSalonStaff')
      const res = await fn({
        salonId, role: 'SALON_PROVIDER',
        name: data.name, phone: data.phone, idNumber: data.idNumber,
        services: data.services,
        password: data.password || undefined,
      })
      setTempCred({ name: data.name, code: res.data.providerCode ?? '', password: res.data.tempPassword })
      await load()
      reset({ services: [] })
      setShowModal(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create provider')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      const fn = httpsCallable(functions, 'deleteSalonStaff')
      await fn({ uid: toDelete.providerId })
      toast.success('Provider removed')
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

  const handleToggleStatus = async (p: SalonProvider) => {
    setSaving(true)
    try {
      const fn = httpsCallable(functions, 'updateSalonProviderServices')
      await fn({ uid: p.providerId, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })
      toast.success('Status updated')
      await load()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Service Providers</h1>
          <p className="page-subtitle">{salon?.name}</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Provider
        </button>
      </div>

      {tempCred && (
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-800">Provider created · ID: <span className="font-mono">{tempCred.code}</span></p>
          <p className="text-xs text-green-700 mt-1">Name: <strong>{tempCred.name}</strong></p>
          <p className="text-xs text-green-700">Login phone + temp password: <strong className="font-mono">{tempCred.password}</strong></p>
          <button onClick={() => setTempCred(null)} className="text-xs text-green-600 underline mt-2">Dismiss</button>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Providers ({providers.length})</h3>
        </div>
        {providers.length === 0 ? (
          <EmptyState title="No providers" description="Add your first service provider." />
        ) : (
          <div className="divide-y divide-gray-50">
            {providers.map(p => (
              <div key={p.providerId} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <span className="font-mono text-xs bg-lango-light text-lango-primary px-1.5 py-0.5 rounded">{p.providerCode}</span>
                    <span className={`badge ${p.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.phone}{p.idNumber ? ` · ID: ${p.idNumber}` : ''}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.services.map(s => (
                      <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{SALON_SERVICE_LABELS[s as SalonServiceType]}</span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => handleResetPassword(p.providerId, p.name)} disabled={resetting === p.providerId}
                    className="btn-secondary text-xs">
                    <RefreshCw className="w-3 h-3" /> {resetting === p.providerId ? '...' : 'Reset PW'}
                  </button>
                  <button onClick={() => handleToggleStatus(p)} disabled={saving}
                    className="btn-ghost text-xs">
                    {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => setToDelete(p)} className="btn-ghost text-xs text-red-500">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Provider Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Service Provider" size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="prov-form" type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Provider'}
            </button>
          </>
        }
      >
        <form id="prov-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Full Name</label>
              <input {...register('name')} className="input" placeholder="e.g. Jane Doe" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Phone (used to login)</label>
              <input {...register('phone')} className="input" placeholder="+254..." />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">ID Number (optional)</label>
              <input {...register('idNumber')} className="input" placeholder="National ID" />
            </div>
            <div>
              <label className="label">Temporary Password</label>
              <div className="flex gap-2">
                <input {...register('password')} className="input" placeholder="Leave blank to generate" />
                <button type="button" onClick={suggestPassword} className="btn-secondary text-xs whitespace-nowrap">Gen</button>
              </div>
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Services Provided</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {ALL_SERVICES.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    value={key}
                    checked={selectedServices.includes(key)}
                    onChange={e => {
                      const cur = selectedServices
                      setValue('services', e.target.checked ? [...cur, key] : cur.filter(s => s !== key), { shouldValidate: true })
                    }}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            {errors.services && <p className="form-error">{errors.services.message}</p>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Provider"
        message={`Remove ${toDelete?.name} (${toDelete?.providerCode})? This deletes their login account.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
