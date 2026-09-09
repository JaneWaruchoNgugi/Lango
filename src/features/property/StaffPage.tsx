import { useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { functions } from '../../firebase/config'
import { useStaff } from '../../hooks/useStaff'
import { canDeleteStaff, canCreateStaff } from '../../domain/permissions'
import { StaffStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { Users, Plus, Search, Filter, MoreVertical, ArrowDownUp, Trash2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AppUser } from '../../types'

// PMs may only create operational staff; propertyId is forced server-side.
const staffSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(9, 'Valid phone required'),
  role: z.enum(['CARETAKER', 'SECURITY_GUARD']),
  password: z.string().min(8, 'At least 8 characters'),
})
type StaffForm = z.infer<typeof staffSchema>

const ROLE_LABEL: Record<string, string> = { SECURITY_GUARD: 'Security Guard', CARETAKER: 'Caretaker', PROPERTY_MANAGER: 'Property Manager' }
const AVATAR_TONES = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500']
const toneFor = (key: string) => AVATAR_TONES[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length]

export default function StaffPage() {
  const { user } = useAuth()
  const { staff, onShift, loading, reload } = useStaff(user?.propertyId)
  const [term, setTerm] = useState('')
  const [roleF, setRoleF] = useState('')
  const [statusF, setStatusF] = useState('')
  const [asc, setAsc] = useState(true)
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<AppUser | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [tempCred, setTempCred] = useState<{ name: string; email: string; password: string } | null>(null)

  const canCreate = canCreateStaff(user?.role)
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'SECURITY_GUARD' },
  })

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('password', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  const onCreate = async (data: StaffForm) => {
    setCreating(true)
    try {
      // propertyId is forced from the caller's claim server-side; sent only for clarity.
      const call = httpsCallable<StaffForm & { propertyId?: string; status: string }, { uid: string; tempPassword: string }>(functions, 'createStaffUser')
      const res = await call({ ...data, propertyId: user?.propertyId ?? '', status: 'ACTIVE' })
      setTempCred({ name: data.name, email: data.email, password: res.data.tempPassword })
      toast.success(`Account created for ${data.name}`)
      setShowAdd(false); reset({ role: 'SECURITY_GUARD' }); reload()
    } catch (e) {
      const msg = (e as { message?: string })?.message
      console.error(e); toast.error(msg ?? 'Could not create staff. Check your connection.')
    } finally { setCreating(false) }
  }

  const canDelete = canDeleteStaff(user?.role)
  const deletable = (s: AppUser) =>
    canDelete && s.uid !== user?.uid && (user?.role === 'SUPER_ADMIN' || (s.role !== 'SUPER_ADMIN' && s.role !== 'PROPERTY_MANAGER'))

  const doDelete = async (s: AppUser) => {
    setBusy(true)
    try {
      await httpsCallable<{ uid: string }, { ok: boolean }>(functions, 'deleteStaffUser')({ uid: s.uid })
      toast.success(`${s.name} removed`)
      reload()
    } catch (e) {
      console.error(e); toast.error('Could not delete staff. Check your connection and permissions.')
    } finally { setBusy(false); setConfirmDelete(null) }
  }

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return staff
      .filter(s => !roleF || s.role === roleF)
      .filter(s => !statusF || s.status === statusF)
      .filter(s => !q || [s.name, s.phone, s.email, ROLE_LABEL[s.role]].some(v => v?.toLowerCase().includes(q)))
      .sort((a, b) => asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
  }, [staff, term, roleF, statusF, asc])

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Staff</h1><p className="text-sm text-gray-500">Manage the caretakers and guards for your property.</p></div>
        </div>
        {canCreate && <button className="btn-primary" onClick={() => { reset({ role: 'SECURITY_GUARD' }); setShowAdd(true) }}><Plus className="w-4 h-4" /> Add Staff</button>}
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, phone, or role…" value={term} onChange={e => setTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input sm:w-36" value={roleF} onChange={e => setRoleF(e.target.value)}>
            <option value="">All roles</option>
            <option value="SECURITY_GUARD">Security Guard</option>
            <option value="CARETAKER">Caretaker</option>
            <option value="PROPERTY_MANAGER">Property Manager</option>
          </select>
          <select className="input sm:w-32" value={statusF} onChange={e => setStatusF(e.target.value)}>
            <option value="">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button className="btn-secondary shrink-0" title="Reset filters" onClick={() => { setTerm(''); setRoleF(''); setStatusF('') }}>
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Roster */}
      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">{shown.length} Staff Member{shown.length === 1 ? '' : 's'}</h3>
          <button onClick={() => setAsc(a => !a)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700">
            <ArrowDownUp className="w-3.5 h-3.5" /> Sort by: Name ({asc ? 'A–Z' : 'Z–A'})
          </button>
        </div>
        {shown.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-gray-400">No staff match your search or filters.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {shown.map(s => (
              <div key={s.uid} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${toneFor(s.uid || s.name)}`}>
                  {s.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">{s.name}</span>
                    {s.role === 'SECURITY_GUARD' && onShift.has(s.uid) && <span className="badge badge-green text-xs">On shift</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{ROLE_LABEL[s.role] ?? s.role} · {s.phone ?? s.email}</p>
                </div>
                <StaffStatusBadge status={s.status} />
                <div className="relative shrink-0">
                  <button onClick={() => setMenuFor(m => m === s.uid ? null : s.uid)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50" title="Actions">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuFor === s.uid && (<>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                    <div className="absolute right-0 mt-1 w-44 card p-1 z-20">
                      <button onClick={() => { navigator.clipboard?.writeText(s.phone ?? s.email ?? '').then(() => toast.success('Contact copied')).catch(() => {}); setMenuFor(null) }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
                        <Copy className="w-4 h-4" /> Copy contact
                      </button>
                      {deletable(s) && (
                        <button onClick={() => { setMenuFor(null); setConfirmDelete(s) }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" /> Delete staff
                        </button>
                      )}
                    </div>
                  </>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && doDelete(confirmDelete)}
        title="Delete staff member"
        message={`Permanently delete ${confirmDelete?.name}'s account? They will lose access immediately. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={busy}
      />

      {/* Add staff */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); reset({ role: 'SECURITY_GUARD' }) }}
        title="Add Staff Member"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); reset({ role: 'SECURITY_GUARD' }) }} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="pmStaffForm" type="submit" className="btn-primary" disabled={creating}>
              {creating && <Spinner size="sm" className="text-white" />} Create Account
            </button>
          </>
        }
      >
        <p className="text-xs text-gray-500 mb-4 p-3 bg-blue-50 rounded-lg">
          The new staff member is added to your property. They must change the temporary password on first login.
        </p>
        <form id="pmStaffForm" onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Peter Otieno" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="peter@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input {...register('phone')} className="input" placeholder="0712345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Role *</label>
              <select {...register('role')} className="input">
                <option value="SECURITY_GUARD">Security Guard</option>
                <option value="CARETAKER">Caretaker</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Temporary Password *</label>
                <button type="button" onClick={suggestPassword} className="text-xs text-lango-primary hover:underline">Generate</button>
              </div>
              <input {...register('password')} type="text" className="input font-mono" placeholder="At least 8 characters" autoComplete="off" />
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>
          </div>
        </form>
      </Modal>

      {/* Credentials to hand over */}
      <Modal isOpen={!!tempCred} onClose={() => setTempCred(null)} title="Account created" size="sm">
        <p className="text-sm text-gray-600 mb-3">
          Share these one-time credentials with <span className="font-medium">{tempCred?.name}</span>. They must change the password on first login.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Login:</span> <span className="font-mono">{tempCred?.email}</span></p>
          <p><span className="text-gray-500">Temp password:</span> <span className="font-mono">{tempCred?.password}</span></p>
        </div>
        <button className="btn-secondary w-full mt-4"
          onClick={() => { navigator.clipboard?.writeText(`${tempCred?.email} / ${tempCred?.password}`); toast.success('Copied') }}>
          Copy credentials
        </button>
      </Modal>
    </div>
  )
}
