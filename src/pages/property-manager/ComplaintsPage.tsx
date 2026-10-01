import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Complaint, ComplaintCategory, ComplaintStatus } from '../../types'

const addSchema = z.object({
  category:    z.enum(['NOISE','CLEANLINESS','SECURITY','MAINTENANCE','NEIGHBOUR','MANAGEMENT','OTHER']),
  unitNumber:  z.string().optional(),
  tenantName:  z.string().optional(),
  description: z.string().min(10, 'Please describe the complaint'),
})
const resolveSchema = z.object({
  response: z.string().min(5, 'Response required'),
})
type AddForm     = z.infer<typeof addSchema>
type ResolveForm = z.infer<typeof resolveSchema>

const CATEGORY_COLOR: Record<ComplaintCategory, string> = {
  NOISE:       'bg-yellow-100 text-yellow-700',
  SECURITY:    'bg-red-100 text-red-700',
  MAINTENANCE: 'bg-orange-100 text-orange-700',
  CLEANLINESS: 'bg-blue-100 text-blue-700',
  NEIGHBOUR:   'bg-purple-100 text-purple-700',
  MANAGEMENT:  'bg-gray-100 text-gray-700',
  OTHER:       'bg-gray-100 text-gray-600',
}
const STATUS_BADGE: Record<ComplaintStatus, string> = {
  NEW:          'badge bg-red-100 text-red-700',
  ACKNOWLEDGED: 'badge bg-yellow-100 text-yellow-700',
  RESOLVED:     'badge badge-green',
}

type TabFilter = ComplaintStatus | 'ALL'

export default function ComplaintsPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''

  const [items,     setItems]     = useState<Complaint[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<TabFilter>('ALL')
  const [catFilter, setCatFilter] = useState<ComplaintCategory | ''>('')
  const [showAdd,   setShowAdd]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [resolving, setResolving] = useState<Complaint | null>(null)
  const [toDelete,  setToDelete]  = useState<Complaint | null>(null)
  const [deleting,  setDeleting]  = useState(false)

  const addForm = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { category: 'OTHER' },
  })
  const resolveForm = useForm<ResolveForm>({ resolver: zodResolver(resolveSchema) })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'complaints'), where('propertyId', '==', pid), orderBy('createdAt', 'desc')))
      .then(snap => setItems(snap.docs.map(d => ({ ...d.data(), id: d.id } as Complaint))))
      .catch(e => console.error('[Complaints]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const shown = useMemo(() => items
    .filter(i => tab === 'ALL' || i.status === tab)
    .filter(i => !catFilter || i.category === catFilter),
  [items, tab, catFilter])

  const stats = {
    NEW:          items.filter(i => i.status === 'NEW').length,
    ACKNOWLEDGED: items.filter(i => i.status === 'ACKNOWLEDGED').length,
    RESOLVED:     items.filter(i => i.status === 'RESOLVED').length,
  }

  const onAdd = async (data: AddForm) => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'complaints'), {
        propertyId:  pid,
        category:    data.category,
        unitNumber:  data.unitNumber || null,
        tenantName:  data.tenantName || null,
        description: data.description,
        status:      'NEW' as ComplaintStatus,
        response:    null,
        resolvedAt:  null,
        createdBy:   user?.uid ?? '',
        createdAt:   serverTimestamp(),
        updatedAt:   serverTimestamp(),
      })
      toast.success('Complaint logged')
      setShowAdd(false)
      addForm.reset()
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const acknowledge = async (item: Complaint) => {
    try {
      await updateDoc(doc(db, 'complaints', item.id), { status: 'ACKNOWLEDGED', updatedAt: serverTimestamp() })
      setItems(prev => prev.map(x => x.id === item.id ? { ...x, status: 'ACKNOWLEDGED' } : x))
      toast.success('Acknowledged')
    } catch { toast.error('Update failed') }
  }

  const onResolve = async (data: ResolveForm) => {
    if (!resolving) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'complaints', resolving.id), {
        status:     'RESOLVED',
        response:   data.response,
        resolvedAt: Timestamp.now(),
        updatedAt:  serverTimestamp(),
      })
      setItems(prev => prev.map(x => x.id === resolving.id ? { ...x, status: 'RESOLVED', response: data.response } : x))
      toast.success('Complaint resolved')
      setResolving(null)
      resolveForm.reset()
    } catch { toast.error('Update failed') } finally { setSaving(false) }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'complaints', toDelete.id))
      setItems(prev => prev.filter(x => x.id !== toDelete.id))
      toast.success('Removed')
      setToDelete(null)
    } catch { toast.error('Delete failed') } finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  const TABS: TabFilter[] = ['ALL', 'NEW', 'ACKNOWLEDGED', 'RESOLVED']
  const CATEGORIES: ComplaintCategory[] = ['NOISE','CLEANLINESS','SECURITY','MAINTENANCE','NEIGHBOUR','MANAGEMENT','OTHER']

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Complaints</h1>
            <p className="text-sm text-gray-500">
              {stats.NEW} new · {stats.ACKNOWLEDGED} acknowledged · {stats.RESOLVED} resolved
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { addForm.reset(); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Log Complaint
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
              {t !== 'ALL' && stats[t as ComplaintStatus] > 0 && (
                <span className="ml-1 text-xs">{stats[t as ComplaintStatus]}</span>
              )}
            </button>
          ))}
        </div>
        <select className="input w-auto text-xs" value={catFilter} onChange={e => setCatFilter(e.target.value as ComplaintCategory | '')}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No complaints match this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(item => (
            <div key={item.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLOR[item.category]}`}>
                      {item.category}
                    </span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[item.status]}`}>
                      {item.status}
                    </span>
                    {item.unitNumber && <span className="text-xs text-gray-500">Unit {item.unitNumber}</span>}
                    {item.tenantName && <span className="text-xs text-gray-500">{item.tenantName}</span>}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{item.description}</p>
                  {item.response && (
                    <p className="text-xs text-green-700 bg-green-50 rounded p-2 mt-1.5">
                      <span className="font-medium">Response: </span>{item.response}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">{format(item.createdAt.toDate(), 'd MMM yyyy, h:mm a')}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.status === 'NEW' && (
                    <button onClick={() => acknowledge(item)} className="btn-secondary text-xs px-2.5 py-1">Acknowledge</button>
                  )}
                  {item.status === 'ACKNOWLEDGED' && (
                    <button onClick={() => { resolveForm.reset(); setResolving(item) }} className="btn-primary text-xs px-2.5 py-1">Resolve</button>
                  )}
                  <button onClick={() => setToDelete(item)} className="text-gray-300 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add complaint */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Complaint" size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="cmpForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Save
            </button>
          </>
        }
      >
        <form id="cmpForm" onSubmit={addForm.handleSubmit(onAdd)} className="space-y-3">
          <div>
            <label className="label">Category *</label>
            <select {...addForm.register('category')} className="input">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unit</label>
              <input {...addForm.register('unitNumber')} className="input" placeholder="e.g. A04" />
            </div>
            <div>
              <label className="label">Tenant Name</label>
              <input {...addForm.register('tenantName')} className="input" placeholder="Optional" />
            </div>
          </div>
          <div>
            <label className="label">Description *</label>
            <textarea {...addForm.register('description')} className="input resize-none" rows={3} placeholder="Describe the complaint…" />
            {addForm.formState.errors.description && (
              <p className="form-error">{addForm.formState.errors.description.message}</p>
            )}
          </div>
        </form>
      </Modal>

      {/* Resolve modal */}
      <Modal isOpen={!!resolving} onClose={() => setResolving(null)} title="Resolve Complaint" size="sm"
        footer={
          <>
            <button onClick={() => setResolving(null)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="resolveForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Mark Resolved
            </button>
          </>
        }
      >
        <form id="resolveForm" onSubmit={resolveForm.handleSubmit(onResolve)} className="space-y-3">
          {resolving && <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">{resolving.description}</p>}
          <div>
            <label className="label">Response / Resolution *</label>
            <textarea {...resolveForm.register('response')} className="input resize-none" rows={3} placeholder="Describe how this was addressed…" />
            {resolveForm.formState.errors.response && (
              <p className="form-error">{resolveForm.formState.errors.response.message}</p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Delete Complaint"
        message="Permanently delete this complaint?"
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
