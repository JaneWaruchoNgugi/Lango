import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, orderBy } from 'firebase/firestore'
import {
  visitorsCol, deliveriesCol, incidentsCol, unitsCol, shiftsCol,
} from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../../components/ui/LoadingScreen'
import {
  BarChart3, DoorOpen, Package, AlertTriangle, Home, Download, Clock,
} from 'lucide-react'
import { format, subDays, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import type { Visitor, Delivery, Incident, Unit, Shift } from '../../types'

const RANGES: [number, string][] = [[7, '7 days'], [30, '30 days'], [90, '90 days']]
const COLORS = { visitors: '#7c3aed', incidents: '#f97316', collected: '#16a34a', uncollected: '#e5e7eb', occupied: '#2563eb', vacant: '#d1d5db' }

export default function ReportsPlaceholder() {
  const { user } = useAuth()
  const isPM = user?.role === 'PROPERTY_MANAGER'
  const pid = user?.propertyId ?? ''

  const [days, setDays] = useState(30)
  const [visitors,   setVisitors]   = useState<Visitor[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [incidents,  setIncidents]  = useState<Incident[]>([])
  const [units,      setUnits]      = useState<Unit[]>([])
  const [shifts,     setShifts]     = useState<Shift[]>([])
  const [loading,    setLoading]    = useState(true)

  useEffect(() => {
    if (!pid) { setLoading(false); return }
    let active = true
    setLoading(true)

    const fromTs = new Date(Date.now() - 90 * 86400_000)

    Promise.all([
      getDocs(query(visitorsCol,   where('propertyId', '==', pid), where('checkInTime', '>=', fromTs), orderBy('checkInTime'))),
      getDocs(query(deliveriesCol, where('propertyId', '==', pid), where('receivedAt', '>=', fromTs),  orderBy('receivedAt'))),
      getDocs(query(incidentsCol,  where('propertyId', '==', pid), orderBy('createdAt'))),
      getDocs(query(unitsCol,      where('propertyId', '==', pid))),
      isPM
        ? getDocs(query(shiftsCol, where('propertyId', '==', pid), where('status', '==', 'ENDED'), orderBy('startTime')))
        : Promise.resolve(null),
    ]).then(([vSnap, dSnap, iSnap, uSnap, sSnap]) => {
      if (!active) return
      setVisitors(vSnap.docs.map(d => d.data()))
      setDeliveries(dSnap.docs.map(d => d.data()))
      setIncidents(iSnap.docs.map(d => d.data()))
      setUnits(uSnap.docs.map(d => d.data()))
      if (sSnap) setShifts(sSnap.docs.map(d => d.data() as Shift))
    }).catch(e => console.error('[Reports]', e)).finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [pid, isPM])

  const report = useMemo(() => {
    const now = Date.now()
    const from = now - days * 86400_000
    const inRange = <T,>(arr: T[], ts: (t: T) => number | null) =>
      arr.filter(t => { const v = ts(t); return v !== null && v >= from })

    const v = inRange(visitors,   x => x.checkInTime?.toMillis?.() ?? null)
    const d = inRange(deliveries, x => x.receivedAt?.toMillis?.() ?? null)
    const i = inRange(incidents,  x => x.createdAt?.toMillis?.() ?? null)

    // Daily visitor counts
    const today = new Date()
    const rangeStart = subDays(today, days - 1)
    const dailyDays = eachDayOfInterval({ start: rangeStart, end: today })
    const visitorsByDay = dailyDays.map(day => {
      const dayStart = startOfDay(day).getTime()
      const dayEnd   = endOfDay(day).getTime()
      return {
        day: format(day, days <= 7 ? 'EEE' : 'd MMM'),
        visitors: v.filter(x => { const t = x.checkInTime?.toMillis?.() ?? 0; return t >= dayStart && t <= dayEnd }).length,
        incidents: i.filter(x => { const t = x.createdAt?.toMillis?.() ?? 0; return t >= dayStart && t <= dayEnd }).length,
      }
    })

    // Deliveries by status
    const collected   = d.filter(x => x.status === 'COLLECTED').length
    const uncollected = d.filter(x => x.status !== 'COLLECTED').length
    const deliveryPie = [
      { name: 'Collected', value: collected },
      { name: 'Uncollected', value: uncollected },
    ]

    // Incidents by type
    const typeCount: Record<string, number> = {}
    i.forEach(x => { typeCount[x.type] = (typeCount[x.type] ?? 0) + 1 })
    const incidentsByType = Object.entries(typeCount).map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))

    // Occupancy
    const occupied = units.filter(u => u.status === 'OCCUPIED').length
    const total    = units.length
    const occupancyPie = [
      { name: 'Occupied', value: occupied },
      { name: 'Vacant',   value: total - occupied },
    ]

    // PM: shift hours per guard
    const guardHours: Record<string, { name: string; shifts: number; totalMins: number; visitors: number; incidents: number }> = {}
    if (isPM) {
      const shiftsInRange = inRange(shifts, x => x.startTime?.toMillis?.() ?? null)
      shiftsInRange.forEach(s => {
        if (!guardHours[s.guardId]) guardHours[s.guardId] = { name: s.guardName, shifts: 0, totalMins: 0, visitors: 0, incidents: 0 }
        const dur = s.endTime ? (s.endTime.toMillis() - s.startTime.toMillis()) / 60000 : 0
        guardHours[s.guardId].shifts++
        guardHours[s.guardId].totalMins += dur
        guardHours[s.guardId].visitors  += s.visitorsRegistered
        guardHours[s.guardId].incidents += s.incidentsReported
      })
    }

    // PM: avg incident resolution time (hours)
    const resolved = i.filter(x => x.status === 'RESOLVED' && x.resolvedAt && x.createdAt)
    const avgResolutionHours = resolved.length
      ? Math.round(resolved.reduce((acc, x) => acc + (x.resolvedAt!.toMillis() - x.createdAt.toMillis()) / 3600000, 0) / resolved.length * 10) / 10
      : null

    // PM: peak hours heatmap (0-23 buckets)
    const peakHours = Array.from({ length: 24 }, (_, h) => ({
      hour: `${h}:00`,
      count: v.filter(x => { const d = x.checkInTime?.toDate?.(); return d && d.getHours() === h }).length,
    }))

    return {
      totalVisitors: v.length, totalDeliveries: d.length, totalIncidents: i.length,
      openIncidents: i.filter(x => x.status === 'OPEN').length,
      occupancyRate: total ? Math.round(occupied / total * 100) : 0,
      visitorsByDay, deliveryPie, incidentsByType, occupancyPie,
      guardHours: Object.values(guardHours).sort((a, b) => b.totalMins - a.totalMins),
      avgResolutionHours, peakHours,
    }
  }, [days, visitors, deliveries, incidents, units, shifts, isPM])

  const exportCsv = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Period', `Last ${days} days`],
      ['Total Visitors', report.totalVisitors],
      ['Total Deliveries', report.totalDeliveries],
      ['Total Incidents', report.totalIncidents],
      ['Open Incidents', report.openIncidents],
      ['Occupancy Rate', `${report.occupancyRate}%`],
    ]
    if (isPM && report.avgResolutionHours !== null) rows.push(['Avg Resolution Time (hrs)', report.avgResolutionHours])
    const csv = rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `lango-report-${days}d.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Reports</h1>
            <p className="text-sm text-gray-500">Property activity summary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-lg gap-1">
            {RANGES.map(([n, label]) => (
              <button key={n} onClick={() => setDays(n)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${days === n ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} className="btn-secondary gap-2">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DoorOpen}      bg="bg-purple-50" color="text-purple-600" label="Visitors"           value={report.totalVisitors} />
        <StatCard icon={Package}       bg="bg-blue-50"   color="text-blue-600"   label="Deliveries"         value={report.totalDeliveries} />
        <StatCard icon={AlertTriangle} bg="bg-orange-50" color="text-orange-600" label="Incidents"          value={report.totalIncidents} sub={`${report.openIncidents} open`} />
        <StatCard icon={Home}          bg="bg-green-50"  color="text-green-600"  label="Occupancy Rate"     value={`${report.occupancyRate}%`} />
      </div>

      {/* Visitor & incident trend */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Daily Activity</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={report.visitorsByDay} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="visitors"  name="Visitors"  fill={COLORS.visitors}  radius={[3,3,0,0]} />
            <Bar dataKey="incidents" name="Incidents" fill={COLORS.incidents} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Deliveries + Occupancy pies */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="section-title mb-4">Deliveries</h2>
          {report.totalDeliveries === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No deliveries in range</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={report.deliveryPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  <Cell fill={COLORS.collected} />
                  <Cell fill={COLORS.uncollected} />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Occupancy</h2>
          {units.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No unit data</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={report.occupancyPie} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  <Cell fill={COLORS.occupied} />
                  <Cell fill={COLORS.vacant} />
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Incidents by type */}
      {report.incidentsByType.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">Incidents by Type</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={report.incidentsByType} layout="vertical" margin={{ top: 0, right: 16, left: 80, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={80} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" name="Count" fill={COLORS.incidents} radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PM-only sections */}
      {isPM && (
        <>
          {/* Resolution time KPI */}
          {report.avgResolutionHours !== null && (
            <div className="stat-card">
              <div className="stat-icon bg-yellow-50"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{report.avgResolutionHours}h</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">Avg Incident Resolution Time</p>
                <p className="text-xs text-gray-400">Based on {report.guardHours.length > 0 ? 'resolved incidents' : 'no resolved incidents yet'}</p>
              </div>
            </div>
          )}

          {/* Guard shift hours */}
          {report.guardHours.length > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Guard Activity (last {days} days)</h2>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Guard</th>
                      <th>Shifts</th>
                      <th>Hours</th>
                      <th>Visitors</th>
                      <th>Incidents</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.guardHours.map(g => (
                      <tr key={g.name}>
                        <td className="font-medium text-gray-900">{g.name}</td>
                        <td>{g.shifts}</td>
                        <td>{(g.totalMins / 60).toFixed(1)}h</td>
                        <td>{g.visitors}</td>
                        <td>{g.incidents}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Peak hours */}
          {report.totalVisitors > 0 && (
            <div className="card p-5">
              <h2 className="section-title mb-4">Peak Gate Hours</h2>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={report.peakHours.filter(h => {
                  const hr = parseInt(h.hour)
                  return hr >= 5 && hr <= 22
                })} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" name="Visitors" stroke={COLORS.visitors} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, bg, color, label, value, sub }: {
  icon: typeof DoorOpen; bg: string; color: string; label: string; value: string | number; sub?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${bg} flex-shrink-0`}><Icon className={`w-5 h-5 ${color}`} /></div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
