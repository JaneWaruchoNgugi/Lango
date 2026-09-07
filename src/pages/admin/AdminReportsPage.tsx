import { useEffect, useMemo, useState } from 'react'
import { getDocs } from 'firebase/firestore'
import {
  propertiesCol, visitorsCol, deliveriesCol, incidentsCol, unitsCol,
} from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { BarChart3, DoorOpen, Package, AlertTriangle, Home } from 'lucide-react'
import type { Property, Visitor, Delivery, Incident, Unit } from '../../types'

const RANGES: [number, string][] = [[7, '7 days'], [30, '30 days'], [90, '90 days']]

export default function AdminReportsPage() {
  const [days, setDays] = useState(30)
  const [properties, setProperties] = useState<Property[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [loadedAt, setLoadedAt] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [propSnap, visSnap, delSnap, incSnap, unitSnap] = await Promise.all([
          getDocs(propertiesCol), getDocs(visitorsCol), getDocs(deliveriesCol),
          getDocs(incidentsCol), getDocs(unitsCol),
        ])
        setProperties(propSnap.docs.map(d => d.data()))
        setVisitors(visSnap.docs.map(d => d.data()))
        setDeliveries(delSnap.docs.map(d => d.data()))
        setIncidents(incSnap.docs.map(d => d.data()))
        setUnits(unitSnap.docs.map(d => d.data()))
        setLoadedAt(Date.now())
      } catch (err) {
        console.error('Reports load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const report = useMemo(() => {
    const from = loadedAt - days * 86400000
    const inRange = <T,>(items: T[], at: (t: T) => number | null) =>
      items.filter(t => { const ts = at(t); return ts !== null && ts >= from })

    const v = inRange(visitors, x => x.checkInTime?.toMillis?.() ?? null)
    const d = inRange(deliveries, x => x.receivedAt?.toMillis?.() ?? null)
    const i = inRange(incidents, x => x.createdAt?.toMillis?.() ?? null)

    const perProperty = properties.map(p => ({
      property: p,
      visitors:   v.filter(x => x.propertyId === p.propertyId).length,
      deliveries: d.filter(x => x.propertyId === p.propertyId).length,
      incidents:  i.filter(x => x.propertyId === p.propertyId).length,
      occupied:   units.filter(u => u.propertyId === p.propertyId && u.status === 'OCCUPIED').length,
      totalUnits: units.filter(u => u.propertyId === p.propertyId).length,
    })).sort((a, b) => b.visitors - a.visitors)

    const occupiedUnits = units.filter(u => u.status === 'OCCUPIED').length
    return {
      visitors: v.length,
      deliveries: d.length,
      incidents: i.length,
      openIncidents: i.filter(x => x.status === 'OPEN').length,
      occupancyRate: units.length ? Math.round((occupiedUnits / units.length) * 100) : 0,
      perProperty,
    }
  }, [days, loadedAt, properties, visitors, deliveries, incidents, units])

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Activity across all properties.</p>
        </div>
        <div className="flex gap-1">
          {RANGES.map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${days === d ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={DoorOpen}      color="text-purple-600" bg="bg-purple-50" label="Visitors"   value={report.visitors} />
        <Metric icon={Package}       color="text-blue-600"   bg="bg-blue-50"   label="Deliveries" value={report.deliveries} />
        <Metric icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" label="Incidents"  value={report.incidents} sub={`${report.openIncidents} open`} />
        <Metric icon={Home}          color="text-green-600"  bg="bg-green-50"  label="Occupancy"  value={report.occupancyRate} suffix="%" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">Per-Property Breakdown</h3>
        </div>
        {report.perProperty.length === 0 ? (
          <EmptyState icon={BarChart3} title="No data yet" description="Reports populate as properties record activity." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Property</th><th>Visitors</th><th>Deliveries</th><th>Incidents</th><th>Occupancy</th></tr>
              </thead>
              <tbody>
                {report.perProperty.map(r => (
                  <tr key={r.property.propertyId}>
                    <td className="font-medium">{r.property.name}</td>
                    <td className="tabular-nums">{r.visitors}</td>
                    <td className="tabular-nums">{r.deliveries}</td>
                    <td className="tabular-nums">{r.incidents}</td>
                    <td className="tabular-nums text-gray-500">{r.occupied}/{r.totalUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({ icon: Icon, color, bg, label, value, sub, suffix }: {
  icon: typeof DoorOpen; color: string; bg: string; label: string
  value: number; sub?: string; suffix?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${bg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}{suffix}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
