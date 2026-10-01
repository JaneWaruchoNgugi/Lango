import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Scissors, MapPin, Phone, ArrowRight } from 'lucide-react'
import { db, functions } from '../../firebase/config'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { Salon } from '../../types'

const schema = z.object({
  name:          z.string().min(2, 'Salon name required'),
  initials:      z.string().min(1, 'Initials required').max(5, 'Max 5 chars').toUpperCase(),
  phone:         z.string().min(9, 'Valid phone required'),
  location:      z.string().min(2, 'Location required'),
  ownerName:     z.string().min(2, 'Owner name required'),
  ownerPhone:    z.string().min(9, 'Valid owner phone required'),
  ownerEmail:    z.string().email('Valid email required'),
  ownerPassword: z.string().min(8, 'At least 8 characters').optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

export default function SalonsPage() {
  const [salons, setSalons]       = useState<Salon[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [tempCred, setTempCred]   = useState<{ name: string; email: string; password: string } | null>(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('ownerPassword', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  useEffect(() => {
    getDocs(query(collection(db, 'salons'), orderBy('createdAt', 'desc')))
      .then(snap => setSalons(snap.docs.map(d => d.data() as Salon)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const onSubmit = async (data: FormData) => {
    setCreating(true)
    try {
      const fn = httpsCallable<unknown, { salonId: string; ownerUid: string; tempPassword: string }>(functions, 'createSalon')
      const res = await fn({
        name: data.name, initials: data.initials, phone: data.phone, location: data.location,
        ownerName: data.ownerName, ownerPhone: data.ownerPhone, ownerEmail: data.ownerEmail,
        ownerPassword: data.ownerPassword || undefined,
      })
      setTempCred({ name: data.ownerName, email: data.ownerEmail, password: res.data.tempPassword })
      // Reload list
      const snap = await getDocs(query(collection(db, 'salons'), orderBy('createdAt', 'desc')))
      setSalons(snap.docs.map(d => d.data() as Salon))
      reset()
      setShowModal(false)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to create salon')
    } finally {
      setCreating(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Salons</h1>
          <p className="page-subtitle">Manage all registered salons</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Salon
        </button>
      </div>

      {tempCred && (
        <div className="card p-4 bg-green-50 border-green-200">
          <p className="text-sm font-semibold text-green-800 mb-1">Salon created — owner credentials</p>
          <p className="text-xs text-green-700">Name: <strong>{tempCred.name}</strong></p>
          <p className="text-xs text-green-700">Email: <strong>{tempCred.email}</strong></p>
          <p className="text-xs text-green-700">Temp password: <strong className="font-mono">{tempCred.password}</strong></p>
          <p className="text-xs text-green-600 mt-1">Share these with the salon owner. They must change the password on first login.</p>
          <button onClick={() => setTempCred(null)} className="text-xs text-green-600 underline mt-2">Dismiss</button>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">All Salons ({salons.length})</h3>
        </div>
        {salons.length === 0 ? (
          <EmptyState icon={Scissors} title="No salons yet" description="Create your first salon to get started." />
        ) : (
          <div className="divide-y divide-gray-50">
            {salons.map(s => (
              <div key={s.salonId} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{s.initials}</span>
                    <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-500"><MapPin className="w-3 h-3" />{s.location}</span>
                    <span className="flex items-center gap-1 text-xs text-gray-500"><Phone className="w-3 h-3" />{s.phone}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Owner: {s.ownerName} · {s.ownerPhone}</p>
                </div>
                <Link to={`/admin/salons/${s.salonId}`} className="btn-secondary text-xs flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Register New Salon" size="lg"
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="salon-form" type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating...' : 'Create Salon'}
            </button>
          </>
        }
      >
        <form id="salon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salon Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Salon Name</label>
              <input {...register('name')} className="input" placeholder="e.g. Lush Salon" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Initials / Code</label>
              <input {...register('initials')} className="input uppercase" placeholder="e.g. LS" maxLength={5} />
              {errors.initials && <p className="form-error">{errors.initials.message}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="+254..." />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Location</label>
              <input {...register('location')} className="input" placeholder="e.g. Westlands, Nairobi" />
              {errors.location && <p className="form-error">{errors.location.message}</p>}
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Salon Owner</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Owner Name</label>
              <input {...register('ownerName')} className="input" placeholder="Full name" />
              {errors.ownerName && <p className="form-error">{errors.ownerName.message}</p>}
            </div>
            <div>
              <label className="label">Owner Phone</label>
              <input {...register('ownerPhone')} className="input" placeholder="+254..." />
              {errors.ownerPhone && <p className="form-error">{errors.ownerPhone.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Owner Email (login)</label>
              <input {...register('ownerEmail')} className="input" type="email" placeholder="owner@email.com" />
              {errors.ownerEmail && <p className="form-error">{errors.ownerEmail.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Temporary Password</label>
              <div className="flex gap-2">
                <input {...register('ownerPassword')} className="input" placeholder="Leave blank to auto-generate" />
                <button type="button" onClick={suggestPassword} className="btn-secondary text-xs whitespace-nowrap">Generate</button>
              </div>
              {errors.ownerPassword && <p className="form-error">{errors.ownerPassword.message}</p>}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
