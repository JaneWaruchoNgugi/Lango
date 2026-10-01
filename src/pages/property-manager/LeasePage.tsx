import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, setDoc, doc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { useTenants } from '../../hooks/useTenants'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { FileText, Plus, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, differenceInDays, addMonths } from 'date-fns'
import toast from 'react-hot-toast'
import type { LeaseRecord } from '../../types'

const schema = z.object({
  moveInDate:           z.string().min(1, 'Move-in date required'),
  leaseDurationMonths:  z.coerce.number().min(1).max(120),
  monthlyRent:          z.coerce.number().optional(),
  notes:                z.string().optional(),
})
type FormData = z.infer<typeof schema>

type FilterMode = 'ALL' | 'EXPIRING' | 'EXPIRED'

export default function LeasePage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''

  const { tenants, loading: tenantsLoading } = useTenants(pid, 'ACTIVE')
  const [leases,  setLeases]  = useState<LeaseRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterMode>('ALL')
  const [search,  setSearch]  = useState('')
  const [editing, setEditing] = useState<{ tenantId: string; tenantName: string; unitNumber: string } | null>(null)
  const [saving,  setSaving]  = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { leaseDurationMonths: 12 },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'leases'), where('propertyId', '==', pid)))
      .then(snap => setLeases(snap.docs.map(d => ({ ...d.data(), id: d.id } as LeaseRecord))))
      .catch(e => console.error('[Leases]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const rows = useMemo(() => {
    const now = new Date()
    return tenants.map(t => {
      const lease = leases.find(l => l.tenantId === t.tenantId)
      const daysLeft = lease ? differenceInDays(lease.leaseEndDate.toDate(), now) : null
      return { tenant: t, lease: lease ?? null, daysLeft }
    }).sort((a, b) => {
      if (a.daysLeft === null) return 1
      if (b.daysLeft === null) return -1
      return a.daysLeft - b.daysLeft
    })
  }, [tenants, leases])

  const shown = useMemo(() => {
    const q = search.toLowerCase()
    return rows
      .filter(r => {
        if (filter === 'EXPIRING') return r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30
        if (filter === 'EXPIRED')  return r.daysLeft !== null && r.daysLeft < 0
        return true
      })
      .filter(r => !q || r.tenant.fullName.toLowerCase().includes(q) || r.tenant.unitNumber.toLowerCase().includes(q))
  }, [rows, filter, search])

  const stats = useMemo(() => ({
    total:    rows.filter(r => r.lease).length,
    expiring: rows.filter(r => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30).length,
    expired:  rows.filter(r => r.daysLeft !== null && r.daysLeft < 0).length,
  }), [rows])

  const openEdit = (tenantId: string, tenantName: string, unitNumber: string) => {
    const existing = leases.find(l => l.tenantId === tenantId)
    const tenant = tenants.find(t => t.tenantId === tenantId)
    reset({
      moveInDate:           existing?.moveInDate?.toDate
        ? format(existing.moveInDate.toDate(), 'yyyy-MM-dd')
        : (tenant?.moveInDate ? format(tenant.moveInDate.toDate(), 'yyyy-MM-dd') : ''),
      leaseDurationMonths:  existing?.leaseDurationMonths ?? 12,
      monthlyRent:          existing?.monthlyRent ?? undefined,
      notes:                existing?.notes ?? '',
    })
    setEditing({ tenantId, tenantName, unitNumber })
  }

  const onSubmit = async (data: FormData) => {
    if (!editing) return
    setSaving(true)
    try {
      const moveIn = new Date(data.moveInDate)
      const leaseEnd = addMonths(moveIn, data.leaseDurationMonths)
      const docId = `${pid}_${editing.tenantId}`
      await setDoc(doc(collection(db, 'leases'), docId), {
        propertyId:          pid,
        unitNumber:          editing.unitNumber,
        tenantId:            editing.tenantId,
        tenantName:          editing.tenantName,
        tenantPhone:         tenants.find(t => t.tenantId === editing.tenantId)?.phoneNumber ?? null,
        moveInDate:          Timestamp.fromDate(moveIn),
        leaseDurationMonths: data.leaseDurationMonths,
        leaseEndDate:        Timestamp.fromDate(leaseEnd),
        monthlyRent:         data.monthlyRent ?? null,
        notes:               data.notes || null,
        createdAt:           serverTimestamp(),
        updatedAt:           serverTimestamp(),
      }, { merge: true })
      toast.success('Lease saved')
      setEditing(null)
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const watchMoveIn = watch('moveInDate')
  const watchDuration = watch('leaseDurationMonths')
  const previewEnd = watchMoveIn && watchDuration
    ? format(addMonths(new Date(watchMoveIn), Number(watchDuration)), 'MMMM yyyy')
    : null

  if (loading || tenantsLoading) return <PageLoader />

  const daysLabel = (d: number | null): { text: string; cls: string } => {
    if (d === null) return { text: 'No lease', cls: 'text-gray-400' }
    if (d < 0)     return { text: `Expired ${Math.abs(d)}d ago`, cls: 'text-red-600 font-medium' }
    if (d <= 30)   return { text: `${d} days left`, cls: 'text-orange-600 font-medium' }
    return { text: `${d} days left`, cls: 'text-green-600' }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lease Tracker</h1>
          <p className="text-sm text-gray-500">{stats.total} leases recorded · {stats.expiring} expiring soon · {stats.expired} expired</p>
        </div>
      </div>

      {/* Stats badges */}
      {(stats.expiring > 0 || stats.expired > 0) && (
        <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-800">
          {stats.expired > 0 && <span className="font-medium">{stats.expired} lease{stats.expired > 1 ? 's' : ''} expired. </span>}
          {stats.expiring > 0 && <span>{stats.expiring} lease{stats.expiring > 1 ? 's' : ''} expiring within 30 days.</span>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
          {(['ALL', 'EXPIRING', 'EXPIRED'] as FilterMode[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'EXPIRING' ? 'Expiring Soon' : f === 'EXPIRED' ? 'Expired' : 'All'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search tenant or unit…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No tenants match this filter.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Tenant</th>
                  <th>Move-in</th>
                  <th>Duration</th>
                  <th>Lease End</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ tenant, lease, daysLeft }) => {
                  const dl = daysLabel(daysLeft)
                  return (
                    <tr key={tenant.tenantId} className={daysLeft !== null && daysLeft < 0 ? 'bg-red-50/30' : daysLeft !== null && daysLeft <= 30 ? 'bg-orange-50/30' : ''}>
                      <td className="font-medium text-gray-900">{tenant.unitNumber}</td>
                      <td>{tenant.fullName}</td>
                      <td className="text-gray-500">{lease ? format(lease.moveInDate.toDate(), 'd MMM yyyy') : '—'}</td>
                      <td className="text-gray-500">{lease ? `${lease.leaseDurationMonths}mo` : '—'}</td>
                      <td className="text-gray-500">{lease ? format(lease.leaseEndDate.toDate(), 'd MMM yyyy') : '—'}</td>
                      <td><span className={`text-xs ${dl.cls}`}>{dl.text}</span></td>
                      <td>
                        <button onClick={() => openEdit(tenant.tenantId, tenant.fullName, tenant.unitNumber)}
                          className="btn-secondary text-xs px-2.5 py-1 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> {lease ? 'Edit' : 'Add'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)}
        title={`Lease — ${editing?.tenantName} (Unit ${editing?.unitNumber})`} size="sm"
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="leaseForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Save
            </button>
          </>
        }
      >
        <form id="leaseForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="label">Move-in Date *</label>
            <input type="date" {...register('moveInDate')} className="input" />
            {errors.moveInDate && <p className="form-error">{errors.moveInDate.message}</p>}
          </div>
          <div>
            <label className="label">Lease Duration (months) *</label>
            <input type="number" {...register('leaseDurationMonths')} className="input" min={1} max={120} />
            {previewEnd && <p className="text-xs text-gray-500 mt-1">Lease ends: {previewEnd}</p>}
          </div>
          <div>
            <label className="label">Monthly Rent (KES)</label>
            <input type="number" {...register('monthlyRent')} className="input" placeholder="Optional" />
          </div>
          <div>
            <label className="label">Notes</label>
            <input {...register('notes')} className="input" placeholder="Optional" />
          </div>
        </form>
      </Modal>
    </div>
  )
}
