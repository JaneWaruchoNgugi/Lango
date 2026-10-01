import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { Ban, Plus, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { BlacklistEntry } from '../../types'

const schema = z.object({
  name:     z.string().min(2, 'Name required'),
  idNumber: z.string().optional(),
  phone:    z.string().optional(),
  reason:   z.string().min(5, 'Please describe the reason'),
})
type FormData = z.infer<typeof schema>

export default function BlacklistPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''

  const [entries,  setEntries]  = useState<BlacklistEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [active,   setActive]   = useState(true)
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [toDelete, setToDelete] = useState<BlacklistEntry | null>(null)
  const [deleting, setDeleting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'blacklist'), where('propertyId', '==', pid)))
      .then(snap => setEntries(snap.docs.map(d => ({ ...d.data(), id: d.id } as BlacklistEntry))))
      .catch(e => console.error('[Blacklist]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const shown = useMemo(() => {
    const q = search.toLowerCase()
    return entries
      .filter(e => !active || e.isActive)
      .filter(e => !q || e.name.toLowerCase().includes(q) || (e.idNumber ?? '').toLowerCase().includes(q) || (e.phone ?? '').includes(q))
      .sort((a, b) => b.dateAdded.toMillis() - a.dateAdded.toMillis())
  }, [entries, search, active])

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'blacklist'), {
        propertyId:  pid,
        name:        data.name,
        idNumber:    data.idNumber || null,
        phone:       data.phone || null,
        reason:      data.reason,
        isActive:    true,
        addedBy:     user?.uid ?? '',
        addedByName: user?.profile?.name ?? '',
        dateAdded:   serverTimestamp(),
        createdAt:   serverTimestamp(),
      })
      toast.success(`${data.name} added to blacklist`)
      setShowAdd(false)
      reset()
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const toggleActive = async (e: BlacklistEntry) => {
    try {
      await updateDoc(doc(db, 'blacklist', e.id), { isActive: !e.isActive })
      setEntries(prev => prev.map(x => x.id === e.id ? { ...x, isActive: !e.isActive } : x))
      toast.success(e.isActive ? 'Deactivated' : 'Reactivated')
    } catch { toast.error('Update failed') }
  }

  const doDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await deleteDoc(doc(db, 'blacklist', toDelete.id))
      setEntries(prev => prev.filter(x => x.id !== toDelete.id))
      toast.success('Removed')
      setToDelete(null)
    } catch { toast.error('Delete failed') } finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  const activeCount   = entries.filter(e => e.isActive).length
  const inactiveCount = entries.filter(e => !e.isActive).length

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Visitor Blacklist</h1>
            <p className="text-sm text-gray-500">{activeCount} active · {inactiveCount} inactive</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { reset(); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Add to Blacklist
        </button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, ID or phone…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setActive(a => !a)}
          className={`btn-secondary text-xs ${active ? 'border-red-200 text-red-600' : ''}`}>
          {active ? 'Active Only' : 'Show All'}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <Ban className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No blacklist entries found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(e => (
            <div key={e.id} className={`card p-4 flex items-start gap-3 ${!e.isActive ? 'opacity-60' : ''}`}>
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 text-red-500">
                <Ban className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{e.name}</p>
                  <span className={`badge ${e.isActive ? 'bg-red-100 text-red-700' : 'badge-gray'} text-xs`}>
                    {e.isActive ? 'Blacklisted' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[e.idNumber && `ID: ${e.idNumber}`, e.phone && `Phone: ${e.phone}`].filter(Boolean).join(' · ')}
                </p>
                <p className="text-sm text-gray-700 mt-1 italic">"{e.reason}"</p>
                <p className="text-xs text-gray-400 mt-1">
                  Added by {e.addedByName} · {e.dateAdded?.toDate ? format(e.dateAdded.toDate(), 'd MMM yyyy') : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => toggleActive(e)} title={e.isActive ? 'Deactivate' : 'Reactivate'}
                  className="text-gray-400 hover:text-lango-primary">
                  {e.isActive ? <ToggleRight className="w-5 h-5 text-red-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => setToDelete(e)} className="text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add to Blacklist" size="sm"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="blForm" type="submit" className="btn-primary bg-red-600 hover:bg-red-700 border-red-600" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Add to Blacklist
            </button>
          </>
        }
      >
        <form id="blForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input {...register('name')} className="input" placeholder="Visitor name" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ID Number</label>
              <input {...register('idNumber')} className="input" placeholder="National ID" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input {...register('phone')} className="input" placeholder="0712…" />
            </div>
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea {...register('reason')} className="input resize-none" rows={3} placeholder="Why is this person being blacklisted?" />
            {errors.reason && <p className="form-error">{errors.reason.message}</p>}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={doDelete}
        title="Remove from Blacklist"
        message={`Permanently remove ${toDelete?.name} from the blacklist?`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
