import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { ShieldCheck, Plus, Search, Trash2, ToggleLeft, ToggleRight, Clock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import type { PreApprovedVisitor } from '../../types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const schema = z.object({
  name:         z.string().min(2, 'Name required'),
  idNumber:     z.string().optional(),
  phone:        z.string().optional(),
  relationship: z.string().optional(),
  unitNumber:   z.string().min(1, 'Unit number required'),
  tenantName:   z.string().optional(),
  accessStart:  z.string().min(4, 'Required'),
  accessEnd:    z.string().min(4, 'Required'),
})
type FormData = z.infer<typeof schema>

const RELATIONSHIPS = ['House Help', 'Family', 'Friend', 'Contractor', 'Cleaner', 'Driver', 'Other']

export default function PreApprovedPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''
  const isGuard = user?.role === 'SECURITY_GUARD'

  const [visitors, setVisitors] = useState<PreApprovedVisitor[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toDelete, setToDelete] = useState<PreApprovedVisitor | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { accessStart: '07:00', accessEnd: '18:00' },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'preApproved'), where('propertyId', '==', pid)))
      .then(snap => setVisitors(snap.docs.map(d => ({ ...d.data(), id: d.id } as PreApprovedVisitor))))
      .catch(e => console.error('[PreApproved]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const shown = useMemo(() => {
    const q = search.toLowerCase()
    return visitors.filter(v =>
      !q || v.name.toLowerCase().includes(q) || v.unitNumber.toLowerCase().includes(q)
    ).sort((a, b) => a.unitNumber.localeCompare(b.unitNumber))
  }, [visitors, search])

  const onSubmit = async (data: FormData) => {
    if (selectedDays.length === 0) { toast.error('Select at least one access day'); return }
    setSaving(true)
    try {
      await addDoc(collection(db, 'preApproved'), {
        propertyId:   pid,
        name:         data.name,
        idNumber:     data.idNumber || '',
        phone:        data.phone || '',
        relationship: data.relationship || '',
        unitId:       '',
        unitNumber:   data.unitNumber,
        blockId:      null,
        blockName:    null,
        tenantId:     '',
        tenantName:   data.tenantName || '',
        accessDays:   selectedDays,
        accessStart:  data.accessStart,
        accessEnd:    data.accessEnd,
        isActive:     true,
        createdAt:    serverTimestamp(),
      })
      toast.success(`${data.name} added to pre-approved list`)
      setShowAdd(false)
      reset()
      setSelectedDays([1, 2, 3, 4, 5])
      load()
    } catch (e) {
      console.error(e)
      toast.error('Could not save')
    } finally { setSaving(false) }
  }

  const toggleActive = async (v: PreApprovedVisitor) => {
    try {
      await updateDoc(doc(db, 'preApproved', v.id), { isActive: !v.isActive })
      setVisitors(prev => prev.map(x => x.id === v.id ? { ...x, isActive: !v.isActive } : x))
      toast.success(v.isActive ? 'Access deactivated' : 'Access activated')
    } catch { toast.error('Update failed') }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'preApproved', toDelete.id))
      setVisitors(prev => prev.filter(x => x.id !== toDelete.id))
      toast.success('Removed')
      setToDelete(null)
    } catch { toast.error('Delete failed') } finally { setDeleting(false) }
  }

  const toggleDay = (d: number) =>
    setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pre-Approved Visitors</h1>
            <p className="text-sm text-gray-500">Standing access for regular visitors</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { reset(); setSelectedDays([1,2,3,4,5]); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Add Visitor
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or unit…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <ShieldCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No pre-approved visitors yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(v => (
            <div key={v.id} className={`card p-4 flex items-start gap-3 ${!v.isActive ? 'opacity-60' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{v.name}</p>
                  <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {v.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {v.relationship && <span className="text-xs text-gray-400">{v.relationship}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Unit {v.unitNumber}{v.tenantName ? ` · ${v.tenantName}` : ''}
                  {v.idNumber ? ` · ID: ${v.idNumber}` : ''}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400">
                    {v.accessStart}–{v.accessEnd} · {v.accessDays.map(d => DAY_LABELS[d]).join(', ')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => toggleActive(v)} title={v.isActive ? 'Deactivate' : 'Activate'}
                  className="text-gray-400 hover:text-lango-primary">
                  {v.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                {!isGuard && (
                  <button onClick={() => setToDelete(v)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Pre-Approved Visitor"
        size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="preApprovedForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Add Visitor
            </button>
          </>
        }
      >
        <form id="preApprovedForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Mary Kamau" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Unit Number *</label>
              <input {...register('unitNumber')} className="input" placeholder="e.g. A05" />
              {errors.unitNumber && <p className="form-error">{errors.unitNumber.message}</p>}
            </div>
            <div>
              <label className="label">Tenant Name</label>
              <input {...register('tenantName')} className="input" placeholder="Resident name" />
            </div>
            <div>
              <label className="label">Relationship</label>
              <select {...register('relationship')} className="input">
                <option value="">Select…</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="0712345678" />
            </div>
            <div>
              <label className="label">ID Number</label>
              <input {...register('idNumber')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Access From *</label>
              <input type="time" {...register('accessStart')} className="input" />
              {errors.accessStart && <p className="form-error">{errors.accessStart.message}</p>}
            </div>
            <div>
              <label className="label">Access Until *</label>
              <input type="time" {...register('accessEnd')} className="input" />
              {errors.accessEnd && <p className="form-error">{errors.accessEnd.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Access Days *</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {DAY_LABELS.map((day, idx) => (
                  <button key={idx} type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedDays.includes(idx) ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Remove Pre-Approved Visitor"
        message={`Remove ${toDelete?.name} from the pre-approved list? They will need to re-register when visiting.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
