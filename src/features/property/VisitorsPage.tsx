import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitorsInRange } from '../../hooks/useVisitorsInRange'
import { filterVisitors, type VisitorFilters } from './visitorFilters'
import { VisitTypeBadge, VisitorStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Modal } from '../../components/ui/Modal'
import { DoorOpen } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import type { Visitor, VisitType, VisitorStatus } from '../../types'

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

export default function VisitorsPage() {
  const { user } = useAuth()
  const [days, setDays] = useState(1)
  const from = useMemo(() => startOfDay(new Date(Date.now() - (days - 1) * 86400000)), [days])
  const to = useMemo(() => endOfDay(new Date()), [days])
  const { visitors, loading } = useVisitorsInRange(user?.propertyId, from, to)
  const [f, setF] = useState<VisitorFilters>({})
  const [selected, setSelected] = useState<Visitor | null>(null)

  const filtered = useMemo(() => filterVisitors(visitors, f), [visitors, f])
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Visitors</h1>
        <div className="flex gap-1">
          {([[1, 'Today'], [7, '7 days'], [30, '30 days']] as [number, string][]).map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${days === d ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input className="input" placeholder="Search name / tenant / unit…" value={f.term ?? ''} onChange={e => setF({ ...f, term: e.target.value })} />
        <select className="input" value={f.visitType ?? ''} onChange={e => setF({ ...f, visitType: (e.target.value || undefined) as VisitType | undefined })}>
          <option value="">All types</option>
          <option value="FRIENDLY_VISIT">Friendly Visit</option><option value="WORK">Work</option>
          <option value="DELIVERY">Delivery</option><option value="SERVICE_PROVIDER">Service Provider</option>
        </select>
        <select className="input" value={f.status ?? ''} onChange={e => setF({ ...f, status: (e.target.value || undefined) as VisitorStatus | undefined })}>
          <option value="">All statuses</option><option value="INSIDE">Inside</option><option value="CHECKED_OUT">Checked out</option>
        </select>
        <button className="btn-secondary" onClick={() => setF({})}>Clear filters</button>
      </div>

      {filtered.length === 0 ? <EmptyState icon={DoorOpen} title="No visitors" description="No visitors match this range/filters." /> : (
        <div className="card divide-y divide-gray-50">
          {filtered.map(v => (
            <button key={v.visitorId} onClick={() => setSelected(v)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{v.visitorName}</span><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500">{v.blockName} • {v.unitNumber} · {v.tenantName || '—'} · {format(v.checkInTime.toDate(), 'd MMM, h:mm a')}</p>
              </div>
              <VisitorStatusBadge status={v.status} />
            </button>
          ))}
        </div>
      )}

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Visitor details">
        {selected && (
          <div className="space-y-2 text-sm">
            <Row k="Name" v={selected.visitorName} />
            <Row k="Type" v={selected.visitType.replace(/_/g, ' ')} />
            <Row k="Visiting" v={`${selected.blockName} ${selected.unitNumber}${selected.tenantName ? ` · ${selected.tenantName}` : ''}`} />
            <Row k="Guard" v={selected.guardName} />
            <Row k="Checked in" v={format(selected.checkInTime.toDate(), 'd MMM yyyy, h:mm a')} />
            <Row k="Checked out" v={selected.checkOutTime ? format(selected.checkOutTime.toDate(), 'd MMM yyyy, h:mm a') : '—'} />
            <Row k="Duration" v={selected.checkOutTime ? formatDuration(durationMinutes(selected.checkInTime.toDate(), selected.checkOutTime.toDate())) : 'In progress'} />
            {selected.reason && <Row k="Reason" v={selected.reason} />}
            {selected.serviceType && <Row k="Service" v={selected.serviceType} />}
            {selected.workType && <Row k="Work" v={`${selected.workType} — ${selected.workDescription ?? ''}`} />}
            {selected.company && <Row k="Company" v={selected.company} />}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
}
