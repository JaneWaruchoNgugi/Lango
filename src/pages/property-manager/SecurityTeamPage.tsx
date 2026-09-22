import { useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { functions } from '../../firebase/config'
import { userDoc, usersCol } from '../../firebase/collections'
import { getDocs, query, where } from 'firebase/firestore'
import { useStaff } from '../../hooks/useStaff'
import { useActiveShifts } from '../../hooks/useActiveShifts'
import { useShiftHistory } from '../../hooks/useShiftHistory'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Shield, Plus, Search, Clock, CheckCircle, Users } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import toast from 'react-hot-toast'
import type { AppUser } from '../../types'
import { SHIFT_CONFIG } from '../../types'

const guardSchema = z.object({
  name:        z.string().min(2, 'Name required'),
  email:       z.string().email('Valid email required'),
  phone:       z.string().min(9, 'Valid phone required'),
  idNumber:    z.string().min(3, 'ID number required'),
  guardNumber: z.string().optional(),
  password:    z.string().min(8, 'At least 8 characters'),
})
type GuardForm = z.infer<typeof guardSchema>

const AVATAR_TONES = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-sky-500','bg-pink-500','bg-teal-500','bg-amber-500']
const toneFor = (key: string) => AVATAR_TONES[[...key].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length]

type Tab = 'team' | 'active' | 'history'

export default function SecurityTeamPage() {
  const { user } = useAuth()
  const { staff, onShift, loading, reload } = useStaff(user?.propertyId)
  const { shifts: activeShifts } = useActiveShifts(user?.propertyId)
  const [guardFilter, setGuardFilter] = useState('')
  const { shifts: history, loading: histLoading } = useShiftHistory(user?.propertyId, guardFilter || null)

  const [tab, setTab] = useState<Tab>('team')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [creating, setCreating] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState<AppUser | null>(null)
  const [deactivateBusy, setDeactivateBusy] = useState(false)
  const [tempCred, setTempCred] = useState<{ name: string; email: string; password: string } | null>(null)

  const guards = useMemo(() => {
    const q = searchTerm.toLowerCase()
    return staff
      .filter(s => s.role === 'SECURITY_GUARD')
      .filter(s => !q || s.name.toLowerCase().includes(q) || s.phone?.includes(q))
  }, [staff, searchTerm])

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<GuardForm>({
    resolver: zodResolver(guardSchema),
  })

  const suggestPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    const arr = new Uint32Array(12)
    crypto.getRandomValues(arr)
    setValue('password', Array.from(arr, n => chars[n % chars.length]).join(''), { shouldValidate: true })
  }

  const onCreate = async (data: GuardForm) => {
    setCreating(true)
    try {
      // Duplicate ID check
      const dup = await getDocs(query(usersCol, where('propertyId', '==', user?.propertyId ?? ''), where('idNumber', '==', data.idNumber)))
      if (!dup.empty) { toast.error('A guard with this ID number already exists'); setCreating(false); return }

      const call = httpsCallable<GuardForm & { propertyId?: string; status: string; role: string }, { uid: string; tempPassword: string }>(functions, 'createStaffUser')
      const res = await call({ ...data, role: 'SECURITY_GUARD', propertyId: user?.propertyId ?? '', status: 'ACTIVE' })

      // Save guard-specific fields
      await updateDoc(userDoc(res.data.uid), {
        idNumber: data.idNumber,
        guardNumber: data.guardNumber ?? null,
        updatedAt: serverTimestamp(),
      })

      setTempCred({ name: data.name, email: data.email, password: res.data.tempPassword })
      toast.success(`Guard account created for ${data.name}`)
      setShowAdd(false)
      reset()
      reload()
    } catch (e) {
      const msg = (e as { message?: string })?.message
      toast.error(msg ?? 'Could not create guard')
    } finally { setCreating(false) }
  }

  const doToggleStatus = async (guard: AppUser) => {
    setDeactivateBusy(true)
    try {
      const newStatus = guard.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
      await updateDoc(userDoc(guard.uid), { status: newStatus, updatedAt: serverTimestamp() })
      toast.success(`${guard.name} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
      reload()
    } catch { toast.error('Could not update status') } finally { setDeactivateBusy(false); setConfirmDeactivate(null) }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Security Team</h1>
            <p className="text-sm text-gray-500">Guards, active shifts, and shift history.</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { reset(); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Add Guard
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto sm:inline-flex">
        {(['team', 'active', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'active' ? 'Active Shifts' : t === 'history' ? 'History' : 'Team'}
            {t === 'active' && activeShifts.length > 0 && (
              <span className="ml-1.5 badge badge-green text-xs">{activeShifts.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Team tab */}
      {tab === 'team' && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search guards…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          {guards.length === 0 ? (
            <div className="card p-10 text-center">
              <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No security guards found. Add a guard to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {guards.map(g => {
                const isOnShift = onShift.has(g.uid)
                const activeShift = activeShifts.find(s => s.guardId === g.uid)
                return (
                  <div key={g.uid} className="card p-4 flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${toneFor(g.uid)}`}>
                      {g.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{g.name}</span>
                        <span className={`badge ${g.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>
                          {g.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                        {isOnShift && <span className="badge badge-blue">On Shift</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Security Guard
                        {g.idNumber ? ` · ID •${g.idNumber.slice(-4)}` : ''}
                        {g.phone ? ` · ${g.phone}` : ''}
                      </p>
                      {activeShift && (
                        <p className="text-xs text-green-600 mt-0.5">
                          🟢 {SHIFT_CONFIG[activeShift.shiftType ?? 'DAY']?.label} · {activeShift.securityPost || 'No post'} · Started {format(activeShift.startTime.toDate(), 'h:mm a')}
                        </p>
                      )}
                      {!isOnShift && g.status === 'ACTIVE' && (
                        <p className="text-xs text-gray-400 mt-0.5">Available</p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmDeactivate(g)}
                      className={`text-xs shrink-0 px-3 py-1.5 rounded-lg border font-medium transition-colors ${g.status === 'ACTIVE' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}
                    >
                      {g.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Active Shifts tab */}
      {tab === 'active' && (
        <div className="space-y-3">
          {activeShifts.length === 0 ? (
            <div className="card p-10 text-center">
              <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No active shifts right now.</p>
            </div>
          ) : (
            activeShifts.map(s => (
              <div key={s.shiftId} className="card p-4 flex items-center gap-3 border-green-100 bg-green-50/40">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{s.guardName}</p>
                  <p className="text-sm text-gray-600">
                    {SHIFT_CONFIG[s.shiftType ?? 'DAY']?.label} · {s.securityPost || 'No post'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Started {format(s.startTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(s.startTime.toDate(), new Date()))}
                  </p>
                  <div className="flex gap-3 text-xs text-gray-400 mt-1">
                    <span>{s.visitorsRegistered} visitors</span>
                    <span>{s.deliveriesRegistered} deliveries</span>
                    <span>{s.incidentsReported} incidents</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <select className="input sm:w-44" value={guardFilter} onChange={e => setGuardFilter(e.target.value)}>
              <option value="">All Guards</option>
              {guards.map(g => <option key={g.uid} value={g.uid}>{g.name}</option>)}
            </select>
          </div>
          {histLoading ? (
            <div className="flex justify-center py-8"><Spinner size="lg" /></div>
          ) : history.length === 0 ? (
            <div className="card p-10 text-center">
              <CheckCircle className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No completed shifts found.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guard</th>
                      <th>Date</th>
                      <th>Shift</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Post</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(s => {
                      const start = s.startTime.toDate()
                      const end = s.endTime?.toDate()
                      return (
                        <tr key={s.shiftId}>
                          <td className="font-medium text-gray-900">{s.guardName}</td>
                          <td className="text-gray-500">{format(start, 'd MMM yyyy')}</td>
                          <td>{SHIFT_CONFIG[s.shiftType ?? 'DAY']?.label ?? 'Day Shift'}</td>
                          <td>{format(start, 'h:mm a')}</td>
                          <td>{end ? format(end, 'h:mm a') : '—'}</td>
                          <td>{s.securityPost || '—'}</td>
                          <td className="text-gray-500">
                            {end ? formatDuration(durationMinutes(start, end)) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Guard modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => { setShowAdd(false); reset() }}
        title="Add Security Guard"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowAdd(false); reset() }} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="addGuardForm" type="submit" className="btn-primary" disabled={creating}>
              {creating && <Spinner size="sm" className="text-white" />} Create Guard
            </button>
          </>
        }
      >
        <p className="text-xs text-gray-500 mb-4 p-3 bg-blue-50 rounded-lg">
          The guard will receive login credentials and must change the temporary password on first login.
        </p>
        <form id="addGuardForm" onSubmit={handleSubmit(onCreate)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. John Kamau" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="john@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input {...register('phone')} className="input" placeholder="0712345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">ID Number *</label>
              <input {...register('idNumber')} className="input" placeholder="National ID" />
              {errors.idNumber && <p className="form-error">{errors.idNumber.message}</p>}
            </div>
            <div>
              <label className="label">Guard / Badge Number</label>
              <input {...register('guardNumber')} className="input" placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
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

      {/* Temp credentials */}
      <Modal isOpen={!!tempCred} onClose={() => setTempCred(null)} title="Guard account created" size="sm">
        <p className="text-sm text-gray-600 mb-3">Share these credentials with <span className="font-medium">{tempCred?.name}</span>.</p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Login:</span> <span className="font-mono">{tempCred?.email}</span></p>
          <p><span className="text-gray-500">Temp password:</span> <span className="font-mono">{tempCred?.password}</span></p>
        </div>
        <button className="btn-secondary w-full mt-4"
          onClick={() => { navigator.clipboard?.writeText(`${tempCred?.email} / ${tempCred?.password}`); toast.success('Copied') }}>
          Copy credentials
        </button>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        onConfirm={() => confirmDeactivate && doToggleStatus(confirmDeactivate)}
        title={confirmDeactivate?.status === 'ACTIVE' ? 'Deactivate Guard' : 'Activate Guard'}
        message={`${confirmDeactivate?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${confirmDeactivate?.name}? They ${confirmDeactivate?.status === 'ACTIVE' ? 'will no longer be able to start shifts' : 'will be able to start shifts again'}.`}
        confirmLabel={confirmDeactivate?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={confirmDeactivate?.status === 'ACTIVE' ? 'danger' : 'default'}
        loading={deactivateBusy}
      />
    </div>
  )
}
