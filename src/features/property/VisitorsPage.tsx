import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitorsInRange } from '../../hooks/useVisitorsInRange'
import { filterVisitors, type VisitorFilters } from './visitorFilters'
import { VisitTypeBadge, VisitorStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { Users, Plus, Search, User, ShieldCheck, Filter, DoorOpen } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import type { Visitor, VisitType, VisitorStatus } from '../../types'

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
const RANGES: [number, string][] = [[1, 'Today'], [7, 'Last 7 days'], [30, 'Last 30 days']]

export default function VisitorsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [days, setDays] = useState(1)
  const [rangeOpen, setRangeOpen] = useState(false)
  const from = useMemo(() => startOfDay(new Date(Date.now() - (days - 1) * 86400000)), [days])
  const to = useMemo(() => endOfDay(new Date()), [days])
  const { visitors, loading } = useVisitorsInRange(user?.propertyId, from, to)
  const [f, setF] = useState<VisitorFilters>({})
  const [selected, setSelected] = useState<Visitor | null>(null)

  const base = user?.role === 'CARETAKER' ? '/caretaker' : user?.role === 'PROPERTY_MANAGER' ? '/property' : '/gate'
  const addVisitor = () => navigate(`${base}/register`)

  const filtered = useMemo(() => filterVisitors(visitors, f), [visitors, f])
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Visitors</h1><p className="text-sm text-gray-500">Manage and track all visitors on site.</p></div>
        </div>
        <button className="btn-primary" onClick={addVisitor}><Plus className="w-4 h-4" /> Add Visitor</button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search visitor name, phone, unit or ID…" value={f.term ?? ''} onChange={e => setF({ ...f, term: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select className="input pl-9" value={f.visitType ?? ''} onChange={e => setF({ ...f, visitType: (e.target.value || undefined) as VisitType | undefined })}>
              <option value="">All types</option>
              <option value="FRIENDLY_VISIT">Personal Visit</option>
              <option value="WORK">Work</option>
              <option value="DELIVERY">Delivery</option>
              <option value="SERVICE_PROVIDER">Service Provider</option>
            </select>
          </div>
          <div className="relative flex-1">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select className="input pl-9" value={f.status ?? ''} onChange={e => setF({ ...f, status: (e.target.value || undefined) as VisitorStatus | undefined })}>
              <option value="">All statuses</option>
              <option value="INSIDE">Inside</option>
              <option value="CHECKED_OUT">Checked out</option>
            </select>
          </div>
          <div className="relative">
            <button className="btn-secondary px-3 h-full" onClick={() => setRangeOpen(o => !o)} title="Date range"><Filter className="w-4 h-4" /></button>
            {rangeOpen && (<>
              <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
              <div className="absolute right-0 mt-1 w-40 card p-1 z-20">
                {RANGES.map(([d, l]) => (
                  <button key={d} onClick={() => { setDays(d); setRangeOpen(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${days === d ? 'bg-lango-primary/10 text-lango-primary font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </>)}
          </div>
        </div>
      </div>

      {/* Content */}
      {visitors.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="relative w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5">
            <DoorOpen className="w-12 h-12 text-lango-primary/40" />
            <div className="absolute bottom-4 right-5 w-7 h-7 rounded-full bg-lango-primary flex items-center justify-center ring-4 ring-white"><Plus className="w-4 h-4 text-white" /></div>
          </div>
          <h3 className="font-bold text-gray-900">No visitors yet</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">Visitors will appear here once they check in to the property.</p>
          <button className="btn-primary mt-5" onClick={addVisitor}><Plus className="w-4 h-4" /> Add Visitor</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-12 text-center text-sm text-gray-400">No visitors match your search or filters.</div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {filtered.map(v => (
            <button key={v.visitorId} onClick={() => setSelected(v)} className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{v.visitorName}</span><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500 truncate">{v.blockName} • {v.unitNumber} · {v.tenantName || '—'} · {format(v.checkInTime.toDate(), 'd MMM, h:mm a')}</p>
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
            {selected.gatePassNumber && <Row k="Gate pass" v={selected.gatePassNumber} />}
            {(selected.vehicleRegistration || selected.vehicleType || selected.vehicleDescription) && <Row k="Vehicle" v={[selected.vehicleRegistration, selected.vehicleType, selected.vehicleDescription].filter(Boolean).join(' · ')} />}
            {selected.itemsBroughtIn && <Row k="Items brought in" v={selected.itemsBroughtIn} />}
          </div>
        )}
      </Modal>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><span className="text-gray-500">{k}</span><span className="font-medium text-gray-900 text-right">{v}</span></div>
}
