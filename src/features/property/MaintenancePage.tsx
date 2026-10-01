import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Wrench, Plus, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, differenceInDays } from 'date-fns'
import toast from 'react-hot-toast'
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus, MaintenanceCategory } from '../../types'

const schema = z.object({
  unitNumber:  z.string().min(1, 'Unit required'),
  category:    z.enum(['PLUMBING', 'ELECTRICAL', 'STRUCTURAL', 'CLEANING', 'APPLIANCE', 'OTHER']),
  description: z.string().min(5, 'Description required'),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})
type FormData = z.infer<typeof schema>

const PRIORITY_BADGE: Record<MaintenancePriority, string> = {
  URGENT: 'bg-red-100 text-red-700',
  HIGH:   'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-gray-100 text-gray-600',
}
const STATUS_BADGE: Record<MaintenanceStatus, string> = {
  PENDING:     'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
}

type StatusFilter = MaintenanceStatus | 'ALL'

export default function MaintenancePage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''
  const isPM = user?.role === 'PROPERTY_MANAGER'

  const [items,     setItems]     = useState<MaintenanceRequest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [statusTab, setStatusTab] = useState<StatusFilter>('ALL')
  const [search,    setSearch]    = useState('')
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [toDelete,  setToDelete]  = useState<MaintenanceRequest | null>(null)
  const [deleting,  setDeleting]  = useState(false)
  const [assignEdit, setAssignEdit] = useState<{ id: string; value: string } | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'PLUMBING', priority: 'MEDIUM' },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'maintenance'), where('propertyId', '==', pid), orderBy('createdAt', 'desc')))
      .then(snap => setItems(snap.docs.map(d => ({ ...d.data(), id: d.id } as MaintenanceRequest))))
      .catch(e => console.error('[Maintenance]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const shown = useMemo(() => {
    const q = search.toLowerCase()
    return items
      .filter(i => statusTab === 'ALL' || i.status === statusTab)
      .filter(i => !q || i.unitNumber.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
  }, [items, statusTab, search])

  const stats = useMemo(() => ({
    pending:    items.filter(i => i.status === 'PENDING').length,
    inProgress: items.filter(i => i.status === 'IN_PROGRESS').length,
    done:       items.filter(i => i.status === 'DONE').length,
    overdue:    items.filter(i => i.status !== 'DONE' && differenceInDays(new Date(), i.createdAt.toDate()) > 7).length,
  }), [items])

  const updateStatus = async (item: MaintenanceRequest, status: MaintenanceStatus) => {
    try {
      const localExtra = status === 'DONE' ? { resolvedDate: Timestamp.now() } : {}
      await updateDoc(doc(db, 'maintenance', item.id), {
        status, updatedAt: serverTimestamp(),
        ...(status === 'DONE' ? { resolvedDate: serverTimestamp() } : {}),
      })
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, status, ...localExtra } : x))
      toast.success(`Marked as ${status.replace('_', ' ')}`)
    } catch { toast.error('Update failed') }
  }

  const saveAssign = async (id: string, value: string) => {
    try {
      await updateDoc(doc(db, 'maintenance', id), { assignedTo: value, updatedAt: serverTimestamp() })
      setItems(prev => prev.map(x => x.id === id ? { ...x, assignedTo: value } : x))
      setAssignEdit(null)
      toast.success('Assigned')
    } catch { toast.error('Update failed') }
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'maintenance'), {
        propertyId:  pid,
        unitNumber:  data.unitNumber,
        category:    data.category,
        description: data.description,
        priority:    data.priority,
        status:      'PENDING' as MaintenanceStatus,
        assignedTo:  null,
        resolvedDate: null,
        createdBy:   user?.uid ?? '',
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      })
      toast.success('Request logged')
      setShowAdd(false)
      reset()
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'maintenance', toDelete.id))
      setItems(prev => prev.filter(x => x.id !== toDelete.id))
      toast.success('Removed')
      setToDelete(null)
    } catch { toast.error('Delete failed') } finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  const STATUS_TABS: StatusFilter[] = ['ALL', 'PENDING', 'IN_PROGRESS', 'DONE']

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Maintenance</h1>
            <p className="text-sm text-gray-500">Track and resolve unit maintenance requests</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { reset(); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Log Request
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Pending',     value: stats.pending,    color: 'text-gray-700' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-blue-600'  },
          { label: 'Done',        value: stats.done,       color: 'text-green-600' },
          { label: 'Overdue',     value: stats.overdue,    color: 'text-red-600'   },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {STATUS_TABS.map(t => (
            <button key={t} onClick={() => setStatusTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search unit or description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No maintenance requests found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(item => {
            const daysOpen = differenceInDays(new Date(), item.createdAt.toDate())
            const overdue  = item.status !== 'DONE' && daysOpen > 7
            return (
              <div key={item.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm">Unit {item.unitNumber}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[item.priority]}`}>
                        {item.priority}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{item.category}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-gray-400">{format(item.createdAt.toDate(), 'd MMM yyyy')}</span>
                      {item.status !== 'DONE' && (
                        <span className={`text-xs font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                          {overdue ? `⚠ Overdue (${daysOpen}d)` : `${daysOpen}d open`}
                        </span>
                      )}
                      {item.assignedTo && <span className="text-xs text-gray-500">→ {item.assignedTo}</span>}
                    </div>

                    {/* PM assign */}
                    {isPM && assignEdit?.id === item.id ? (
                      <div className="flex gap-2 mt-2">
                        <input
                          className="input text-xs flex-1"
                          value={assignEdit.value}
                          onChange={e => setAssignEdit({ ...assignEdit, value: e.target.value })}
                          placeholder="Assign to (name)"
                          autoFocus
                        />
                        <button onClick={() => saveAssign(item.id, assignEdit.value)} className="btn-primary text-xs px-3">Save</button>
                        <button onClick={() => setAssignEdit(null)} className="btn-secondary text-xs px-3">Cancel</button>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {item.status === 'PENDING' && (
                      <button onClick={() => updateStatus(item, 'IN_PROGRESS')} className="btn-secondary text-xs px-2.5 py-1">Start</button>
                    )}
                    {item.status === 'IN_PROGRESS' && (
                      <button onClick={() => updateStatus(item, 'DONE')} className="btn-primary text-xs px-2.5 py-1">Mark Done</button>
                    )}
                    {isPM && !assignEdit && (
                      <button onClick={() => setAssignEdit({ id: item.id, value: item.assignedTo ?? '' })} className="btn-secondary text-xs px-2.5 py-1">Assign</button>
                    )}
                    {isPM && (
                      <button onClick={() => setToDelete(item)} className="text-gray-300 hover:text-red-500 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Maintenance Request" size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="maintForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Save
            </button>
          </>
        }
      >
        <form id="maintForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Unit Number *</label>
              <input {...register('unitNumber')} className="input" placeholder="e.g. A03" />
              {errors.unitNumber && <p className="form-error">{errors.unitNumber.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('category')} className="input">
                {(['PLUMBING','ELECTRICAL','STRUCTURAL','CLEANING','APPLIANCE','OTHER'] as MaintenanceCategory[]).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority *</label>
              <select {...register('priority')} className="input">
                {(['URGENT','HIGH','MEDIUM','LOW'] as MaintenancePriority[]).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <textarea {...register('description')} className="input resize-none" rows={3} placeholder="Describe the issue…" />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Delete Request"
        message={`Delete maintenance request for Unit ${toDelete?.unitNumber}?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
