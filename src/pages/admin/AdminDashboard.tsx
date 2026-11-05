import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Users, Home, DoorOpen,
  AlertTriangle, Plus, ArrowRight, Trash2,
} from 'lucide-react'
import {
  collection, query, where, getDocs, orderBy, limit, doc, deleteDoc,
} from 'firebase/firestore'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PropertyStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Property, Visitor, Incident } from '../../types'
import { format } from 'date-fns'
import { PageHeader } from '../../components/ui/PageHeader'
import { humanize } from '../../utils/humanize'

interface Stats {
  totalProperties: number
  activeProperties: number
  trialProperties: number
  suspendedProperties: number
  totalUnits: number
  occupiedUnits: number
  visitorsToday: number
  activeStaff: number
}

interface TrendPoint {
  day: string
  visitors: number
  incidents: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentProperties, setRecentProperties] = useState<Property[]>([])
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([])
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([])
  const [trend, setTrend]                   = useState<TrendPoint[]>([])
  const [expiringTrials, setExpiringTrials] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  const deleteIncident = async (incidentId: string) => {
    await deleteDoc(doc(db, 'incidents', incidentId))
    setRecentIncidents(prev => prev.filter(i => i.incidentId !== incidentId))
  }

  const deleteVisitor = async (visitorId: string) => {
    await deleteDoc(doc(db, 'visitors', visitorId))
    setRecentVisitors(prev => prev.filter(v => v.visitorId !== visitorId))
  }

  useEffect(() => {
    const load = async () => {
      try {
        // Properties
        const propSnap = await getDocs(collection(db, 'properties'))
        const props = propSnap.docs.map(d => d.data() as Property)

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        // Visitors today
        const visSnap = await getDocs(
          query(collection(db, 'visitors'),
            where('checkInTime', '>=', todayStart),
            orderBy('checkInTime', 'desc'),
            limit(5)
          )
        )
        const visitors = visSnap.docs.map(d => d.data() as Visitor)

        // Units
        const unitSnap = await getDocs(collection(db, 'units'))
        const units = unitSnap.docs.map(d => d.data() as any)
        const occupiedUnits = units.filter((u: any) => u.status === 'OCCUPIED').length

        // Active staff
        const staffSnap = await getDocs(
          query(collection(db, 'users'), where('status', '==', 'ACTIVE'))
        )

        // Recent incidents
        const incSnap = await getDocs(
          query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(5))
        )
        const incidents = incSnap.docs.map(d => d.data() as Incident)

        // Recent properties
        const recentPropSnap = await getDocs(
          query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(5))
        )
        const recentProps = recentPropSnap.docs.map(d => d.data() as Property)

        // 7-day trend
        const weekStart = new Date(Date.now() - 6 * 86400000)
        weekStart.setHours(0, 0, 0, 0)
        const [trendVisSnap, trendIncSnap] = await Promise.all([
          getDocs(query(collection(db, 'visitors'),  where('checkInTime', '>=', weekStart), orderBy('checkInTime'))),
          getDocs(query(collection(db, 'incidents'), where('createdAt', '>=', weekStart),   orderBy('createdAt'))),
        ])
        const trendVis = trendVisSnap.docs.map(d => d.data() as Visitor)
        const trendInc = trendIncSnap.docs.map(d => d.data() as Incident)
        const trendPoints: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86400000)
          const lo = new Date(d); lo.setHours(0, 0, 0, 0)
          const hi = new Date(d); hi.setHours(23, 59, 59, 999)
          return {
            day: format(d, 'EEE'),
            visitors:  trendVis.filter(v => { const t = v.checkInTime?.toMillis?.() ?? 0; return t >= lo.getTime() && t <= hi.getTime() }).length,
            incidents: trendInc.filter(v => { const t = v.createdAt?.toMillis?.() ?? 0;   return t >= lo.getTime() && t <= hi.getTime() }).length,
          }
        })
        setTrend(trendPoints)

        // B6: properties on TRIAL expiring within 7 days
        const in7Days = Date.now() + 7 * 86400000
        setExpiringTrials(
          props.filter(p =>
            p.status === 'TRIAL' &&
            p.trialEndDate &&
            p.trialEndDate.toMillis() <= in7Days,
          ).sort((a, b) => (a.trialEndDate!.toMillis() - b.trialEndDate!.toMillis())),
        )

        setStats({
          totalProperties:    props.length,
          activeProperties:   props.filter(p => p.status === 'ACTIVE').length,
          trialProperties:    props.filter(p => p.status === 'TRIAL').length,
          suspendedProperties:props.filter(p => p.status === 'SUSPENDED').length,
          totalUnits:         units.length,
          occupiedUnits,
          visitorsToday:      visitors.length,
          activeStaff:        staffSnap.size,
        })
        setRecentVisitors(visitors)
        setRecentProperties(recentProps)
        setRecentIncidents(incidents)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.profile?.name?.split(' ')[0] ?? 'Admin'}`}
        subtitle="Here's what's happening across your properties today."
        actions={
          <Link to="/admin/properties/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Property
          </Link>
        }
      />

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Building2} tone="blue" label="Properties" value={stats.totalProperties} sub={`${stats.activeProperties} active`} />
          <StatCard
            icon={Home} tone="green" label="Units" value={stats.totalUnits}
            sub={stats.totalUnits ? `${Math.round((stats.occupiedUnits / stats.totalUnits) * 100)}% occupied` : 'No units yet'}
          />
          <StatCard icon={DoorOpen} tone="violet" label="Visitors today" value={stats.visitorsToday} sub="Across all properties" />
          <StatCard icon={Users} tone="amber" label="Active staff" value={stats.activeStaff} sub="Guards and caretakers" />
        </div>
      )}

      {/* Trial expiry warnings (B6) */}
      {expiringTrials.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {expiringTrials.length} trial {expiringTrials.length === 1 ? 'property expires' : 'properties expire'} within 7 days
            </p>
          </div>
          <div className="space-y-1.5">
            {expiringTrials.map(p => (
              <Link
                key={p.propertyId}
                to={`/admin/properties/${p.propertyId}`}
                className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm hover:bg-white transition-colors"
              >
                <span className="font-medium text-gray-800">{p.name}</span>
                <span className="text-xs text-amber-700">
                  Expires {format(p.trialEndDate!.toDate(), 'dd MMM yyyy')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 7-day trends (B3) and property status */}
      {stats && (
        <div className="grid lg:grid-cols-3 gap-4">
          <TrendCard title="Visitors" data={trend} dataKey="visitors" color="#2563eb" />
          <TrendCard title="Incidents" data={trend} dataKey="incidents" color="#f97316" />
          <StatusCard active={stats.activeProperties} trial={stats.trialProperties} suspended={stats.suspendedProperties} />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Properties */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="section-title mb-0">Recent Properties</h3>
            <Link to="/admin/properties" className="text-xs text-lango-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentProperties.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Add your first property to get started."
              action={
                <Link to="/admin/properties/new" className="btn-primary text-xs">
                  <Plus className="w-3 h-3" /> Add Property
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentProperties.map(prop => (
                <Link
                  key={prop.propertyId}
                  to={`/admin/properties/${prop.propertyId}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-lango-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-lango-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{prop.name}</p>
                      <p className="text-xs text-gray-500 truncate">{prop.city}, {prop.county}</p>
                    </div>
                  </div>
                  <PropertyStatusBadge status={prop.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="section-title mb-0">Visitors Today</h3>
            <span className="text-xs text-gray-400">All properties</span>
          </div>
          {recentVisitors.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No visitors today" description="Visitors will appear here when registered." />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentVisitors.map(v => (
                <div key={v.visitorId} className="flex items-center justify-between px-5 py-3.5 group">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.visitorName}</p>
                    <p className="text-xs text-gray-500">
                      Unit {v.unitNumber} · {format(v.checkInTime.toDate(), 'h:mm a')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${v.status === 'INSIDE' ? 'badge-green' : 'badge-gray'}`}>
                      {v.status === 'INSIDE' ? 'Inside' : 'Checked Out'}
                    </span>
                    <button
                      onClick={() => deleteVisitor(v.visitorId)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete visitor record" aria-label="Delete visitor record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      {recentIncidents.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="section-title mb-0">Recent Incidents</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIncidents.map(inc => (
              <div key={inc.incidentId} className="flex items-center justify-between px-5 py-3.5 group">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{humanize(inc.type)}</p>
                  <p className="text-xs text-gray-500 truncate">{inc.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {inc.status === 'RESOLVED' || inc.status === 'CLOSED' ? (
                    <span className="badge badge-green">{humanize(inc.status)}</span>
                  ) : (
                    <span className={`badge ${
                      inc.severity === 'CRITICAL' ? 'badge-red' :
                      inc.severity === 'HIGH'     ? 'badge-orange' :
                      inc.severity === 'MEDIUM'   ? 'badge-yellow' : 'badge-green'
                    }`}>{humanize(inc.severity)}</span>
                  )}
                  <button
                    onClick={() => deleteIncident(inc.incidentId)}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete incident" aria-label="Delete incident"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const TONES = {
  blue:   'bg-blue-50 text-blue-600',
  green:  'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber:  'bg-amber-50 text-amber-600',
} as const

function StatCard({
  icon: Icon, tone, label, value, sub,
}: {
  icon: typeof Building2; tone: keyof typeof TONES
  label: string; value: number; sub?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900">{value.toLocaleString()}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function TrendCard({ title, data, dataKey, color }: {
  title: string; data: TrendPoint[]; dataKey: 'visitors' | 'incidents'; color: string
}) {
  const total = data.reduce((n, p) => n + p[dataKey], 0)
  const gid = `trend-${dataKey}`
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-xs text-gray-400">Last 7 days</p>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
      <div className="mt-3 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={color} stopOpacity={0.22} />
                <stop offset="1" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(max, 4)]} />
            <Tooltip
              cursor={{ stroke: '#e5e7eb' }}
              contentStyle={{ fontSize: 12, padding: '6px 10px', borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,.08)' }}
              labelStyle={{ color: '#6b7280' }}
            />
            <Area type="monotone" dataKey={dataKey} name={title} stroke={color} strokeWidth={2} fill={`url(#${gid})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function StatusCard({ active, trial, suspended }: { active: number; trial: number; suspended: number }) {
  const total = active + trial + suspended
  const rows = [
    { label: 'Active', value: active, bar: 'bg-emerald-500' },
    { label: 'Trial', value: trial, bar: 'bg-blue-500' },
    { label: 'Suspended', value: suspended, bar: 'bg-red-500' },
  ]
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-gray-500">Property status</p>
        <Link to="/admin/properties" className="text-xs text-lango-primary hover:underline">Manage</Link>
      </div>
      <p className="mt-1 font-display text-2xl font-bold text-gray-900">{total}</p>
      <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
        {total > 0 && rows.map(r => r.value > 0 && (
          <div key={r.label} className={r.bar} style={{ width: `${(r.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map(r => (
          <li key={r.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span className={`w-2 h-2 rounded-full ${r.bar}`} />{r.label}
            </span>
            <span className="font-semibold text-gray-900 tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
