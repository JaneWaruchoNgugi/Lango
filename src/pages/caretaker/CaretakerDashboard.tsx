import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import {
  UserPlus, Package, Users, AlertTriangle, CalendarDays, Clock, ChevronRight,
  LogIn, LogOut, FileClock, Home, Wrench, type LucideIcon,
} from 'lucide-react'
import { format, startOfMonth, subMonths } from 'date-fns'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { VISIT_TYPE_LABEL } from '../../domain/visitTypes'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { useShift } from '../../hooks/useShift'
import { startShift as startShiftService, endShift as endShiftService } from '../../services/shiftService'
import { EmptyState } from '../../components/ui/EmptyState'
import { humanize } from '../../utils/humanize'
import type { Delivery, Incident, PreApprovedVisitor, Unit, UserRole } from '../../types'

function routesFor(role: UserRole | null | undefined) {
  if (role === 'SECURITY_GUARD') return { register: '/gate/register', deliveries: '/gate/deliveries', inside: '/gate/inside', incidents: '/gate/incidents', activity: '/gate/inside' }
  const b = role === 'PROPERTY_MANAGER' ? '/property' : '/caretaker'
  return { register: `${b}/register`, deliveries: `${b}/deliveries`, inside: `${b}/visitors`, incidents: `${b}/incidents`, activity: `${b}/visitors` }
}

function StatCard({ to, icon: Icon, value, label, tone }: { to: string; icon: LucideIcon; value: number; label: string; tone: string }) {
  return (
    <Link to={to} className="group card p-4 sm:p-5 flex flex-col hover:shadow-card-hover hover:border-gray-300/70 transition-all">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="font-display text-3xl font-semibold text-gray-900 mt-3 leading-none tabular-nums">{value}</p>
    </Link>
  )
}

function Kpi({ label, value, icon: Icon, tone, note, noteTone = 'text-gray-500', to }: { label: string; value: string | number; icon: LucideIcon; tone: string; note?: string | null; noteTone?: string; to?: string }) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${tone}`}><Icon className="w-3.5 h-3.5" /></span>
        <p className="text-[13px] text-gray-500">{label}</p>
      </div>
      <p className="font-display text-2xl font-semibold text-gray-900 mt-2 tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {note && <p className={`text-xs font-medium mt-1 ${noteTone}`}>{note}</p>}
    </>
  )
  return to
    ? <Link to={to} className="block p-4 sm:p-5 hover:bg-gray-50/70 transition-colors">{body}</Link>
    : <div className="p-4 sm:p-5">{body}</div>
}

function ActionCard({ to, icon: Icon, title, subtitle }: { to: string; icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <Link to={to} className="card p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-3 text-center sm:text-left hover:shadow-card-hover hover:border-gray-300/70 transition-all">
      <div className="w-10 h-10 rounded-xl bg-lango-light flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-lango-primary" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[13px] sm:text-sm text-gray-900 leading-tight">{title}</p>
        <p className="hidden sm:block text-xs text-gray-500 truncate mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="hidden sm:block w-4 h-4 text-gray-300 shrink-0" />
    </Link>
  )
}

type ActivityItem = { id: string; title: string; sub: string; ts: Date; icon: LucideIcon; tone: string }

export default function RoleDashboard() {
  const { user } = useAuth()
  const propertyId = user?.propertyId ?? ''
  const role = user?.role
  const R = routesFor(role)
  const isGuard = role === 'SECURITY_GUARD'

  const [loading, setLoading] = useState(true)
  const [visitorsToday, setVisitorsToday] = useState(0)
  const [expectedToday, setExpectedToday] = useState(0)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [now, setNow] = useState(new Date())
  const [shiftLoading, setShiftLoading] = useState(false)
  // PM KPIs
  const [pmKpi, setPmKpi] = useState<{
    visitorsThisMonth: number; visitorsPrevMonth: number;
    occupancyRate: number; avgResolutionHours: number | null;
    uncollectedDeliveries: number; pendingMaintenance: number;
  } | null>(null)

  const { visitors: currentVisitors } = useCurrentVisitors(propertyId)
  const { shift } = useShift(isGuard ? user?.uid : null, isGuard ? user?.propertyId : null)
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'User', role: role ?? 'SECURITY_GUARD' }

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (!propertyId) return
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const dow = new Date().getDay()
    Promise.all([
      getDocs(query(collection(db, 'visitors'), where('propertyId', '==', propertyId), where('checkInTime', '>=', Timestamp.fromDate(todayStart)))),
      getDocs(query(collection(db, 'deliveries'), where('propertyId', '==', propertyId), where('receivedAt', '>=', Timestamp.fromDate(todayStart)))),
      getDocs(query(collection(db, 'incidents'), where('propertyId', '==', propertyId), where('status', '==', 'OPEN'), orderBy('createdAt', 'desc'), limit(5))),
      getDocs(query(collection(db, 'preApproved'), where('propertyId', '==', propertyId))),
    ]).then(([visSnap, delSnap, incSnap, preSnap]) => {
      setVisitorsToday(visSnap.size)
      setDeliveries(delSnap.docs.slice(0, 5).map(d => d.data() as Delivery))
      setIncidents(incSnap.docs.map(d => d.data() as Incident))
      setExpectedToday(preSnap.docs.map(d => d.data() as PreApprovedVisitor).filter(p => p.isActive && (p.accessDays?.includes(dow) ?? false)).length)
    }).catch(console.error).finally(() => setLoading(false))
  }, [propertyId])

  // PM-only KPI fetch
  useEffect(() => {
    if (role !== 'PROPERTY_MANAGER' || !propertyId) return
    const now = new Date()
    const thisMonthStart  = startOfMonth(now)
    const prevMonthStart  = startOfMonth(subMonths(now, 1))

    Promise.all([
      getDocs(query(collection(db, 'visitors'), where('propertyId', '==', propertyId), where('checkInTime', '>=', Timestamp.fromDate(thisMonthStart)))),
      getDocs(query(collection(db, 'visitors'), where('propertyId', '==', propertyId), where('checkInTime', '>=', Timestamp.fromDate(prevMonthStart)), where('checkInTime', '<', Timestamp.fromDate(thisMonthStart)))),
      getDocs(query(collection(db, 'units'), where('propertyId', '==', propertyId))),
      getDocs(query(collection(db, 'incidents'), where('propertyId', '==', propertyId), where('status', '==', 'RESOLVED'))),
      getDocs(query(collection(db, 'deliveries'), where('propertyId', '==', propertyId), where('status', '==', 'RECEIVED'))),
      getDocs(query(collection(db, 'maintenance'), where('propertyId', '==', propertyId), where('status', 'in', ['PENDING', 'IN_PROGRESS']))),
    ]).then(([thisVisSnap, prevVisSnap, unitsSnap, resolvedSnap, uncollSnap, maintSnap]) => {
      const units = unitsSnap.docs.map(d => d.data() as Unit)
      const occupied = units.filter(u => u.status === 'OCCUPIED').length
      const occupancyRate = units.length ? Math.round(occupied / units.length * 100) : 0

      const resolvedIncs = resolvedSnap.docs.map(d => d.data() as Incident)
      const withTime = resolvedIncs.filter(i => i.resolvedAt && i.createdAt)
      const avgRes = withTime.length
        ? Math.round(withTime.reduce((acc, i) => acc + (i.resolvedAt!.toMillis() - i.createdAt.toMillis()) / 3600000, 0) / withTime.length * 10) / 10
        : null

      setPmKpi({
        visitorsThisMonth:    thisVisSnap.size,
        visitorsPrevMonth:    prevVisSnap.size,
        occupancyRate,
        avgResolutionHours:   avgRes,
        uncollectedDeliveries: uncollSnap.size,
        pendingMaintenance:    maintSnap.size,
      })
    }).catch(console.error)
  }, [propertyId, role])

  const handleShift = async () => {
    setShiftLoading(true)
    try {
      if (shift) await endShiftService(shift, actor)
      else if (propertyId) await startShiftService(propertyId, actor)
    } finally { setShiftLoading(false) }
  }

  if (loading) return <PageLoader />

  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' })()
  const firstName = user?.profile?.name?.split(' ').slice(0, 2).join(' ') ?? 'there'

  const activity: ActivityItem[] = [
    ...currentVisitors.map(v => ({ id: v.visitorId, title: `${v.visitorName} checked in`, sub: `${v.unitNumber} · ${VISIT_TYPE_LABEL[v.visitType]}`, ts: v.checkInTime.toDate(), icon: LogIn, tone: 'bg-green-50 text-green-600' })),
    ...deliveries.map(d => ({ id: d.deliveryId, title: 'Delivery registered', sub: `${d.unitNumber} · ${d.company}`, ts: d.receivedAt.toDate(), icon: Package, tone: 'bg-orange-50 text-orange-500' })),
    ...incidents.map(i => ({ id: i.incidentId, title: 'Incident reported', sub: humanize(i.type), ts: i.createdAt.toDate(), icon: AlertTriangle, tone: 'bg-red-50 text-red-500' })),
  ].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 6)

  const kpis = role === 'PROPERTY_MANAGER' && pmKpi ? [
    { label: 'Visitors this month', value: pmKpi.visitorsThisMonth, icon: Users, tone: 'bg-blue-50 text-blue-600',
      ...(pmKpi.visitorsPrevMonth > 0 ? (() => { const c = Math.round((pmKpi.visitorsThisMonth - pmKpi.visitorsPrevMonth) / pmKpi.visitorsPrevMonth * 100); return { note: `${c >= 0 ? '+' : ''}${c}% vs last month`, noteTone: c >= 0 ? 'text-green-600' : 'text-red-500' } })() : {}) },
    { label: 'Occupancy', value: `${pmKpi.occupancyRate}%`, icon: Home, tone: 'bg-green-50 text-green-600' },
    ...(pmKpi.avgResolutionHours !== null ? [{ label: 'Avg. incident resolution', value: `${pmKpi.avgResolutionHours}h`, icon: Clock, tone: 'bg-amber-50 text-amber-600' }] : []),
    { label: 'Uncollected deliveries', value: pmKpi.uncollectedDeliveries, icon: Package, tone: 'bg-orange-50 text-orange-500', to: '/property/deliveries',
      ...(pmKpi.uncollectedDeliveries > 0 ? { note: 'Needs attention', noteTone: 'text-orange-600' } : {}) },
    { label: 'Open maintenance', value: pmKpi.pendingMaintenance, icon: Wrench, tone: 'bg-purple-50 text-purple-600', to: '/property/maintenance',
      ...(pmKpi.pendingMaintenance > 0 ? { note: 'Action required', noteTone: 'text-purple-600' } : {}) },
  ] : []
  const kpiCols = kpis.length >= 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4'

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Greeting + date chip */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-gray-500">{format(now, 'EEEE, d MMMM')}</p>
          <h1 className="page-title mt-0.5">{greeting}, {firstName}</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-xl bg-white border border-gray-200/80 shadow-sm px-3.5 py-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <p className="text-sm font-semibold text-gray-900 tabular-nums">{format(now, 'h:mm a')}</p>
        </div>
      </div>

      {/* Shift banner: guards start/end their shift here */}
      {isGuard && (
        <div className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${shift ? 'bg-green-50/70 border-green-200/70' : 'bg-white border-gray-200/80 shadow-card'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="relative flex w-2.5 h-2.5 shrink-0">
              {shift && <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-60" />}
              <span className={`relative w-2.5 h-2.5 rounded-full ${shift ? 'bg-green-500' : 'bg-gray-400'}`} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{shift ? "You're on shift" : 'Not on shift'}</p>
              {shift && shift.startTime && <p className="text-xs text-gray-600">Since {format(shift.startTime.toDate(), 'h:mm a')}</p>}
            </div>
          </div>
          <button onClick={handleShift} disabled={shiftLoading} className={shift ? 'btn-secondary' : 'btn-primary'}>
            {shiftLoading ? '…' : shift ? <><LogOut className="w-4 h-4" /> End shift</> : <><LogIn className="w-4 h-4" /> Start shift</>}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard to={R.inside} icon={Users} value={visitorsToday} label="Visitors today" tone="bg-blue-50 text-blue-600" />
        <StatCard to={R.inside} icon={LogIn} value={currentVisitors.length} label="Inside now" tone="bg-green-50 text-green-600" />
        <StatCard to={R.inside} icon={CalendarDays} value={expectedToday} label="Expected today" tone="bg-indigo-50 text-indigo-600" />
        <StatCard to={R.incidents} icon={AlertTriangle} value={incidents.length} label="Open incidents" tone="bg-orange-50 text-orange-500" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
        <Link to={R.register} className="col-span-3 lg:col-span-1 flex items-center gap-3.5 p-4 rounded-xl bg-lango-primary text-white shadow-sm shadow-blue-600/20 hover:bg-lango-secondary transition-colors">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><UserPlus className="w-5 h-5" /></div>
          <div className="flex-1 min-w-0"><p className="font-semibold">Register visitor</p><p className="text-white/75 text-xs">Check in a new guest</p></div>
          <ChevronRight className="w-5 h-5 text-white/70" />
        </Link>
        <ActionCard to={R.deliveries} icon={Package} title="Deliveries" subtitle="Receive and hand over" />
        <ActionCard to={R.inside} icon={Users} title="Inside now" subtitle="Who's on the property" />
        <ActionCard to={R.incidents} icon={AlertTriangle} title="Incidents" subtitle="Report or review" />
      </div>

      {/* PM KPI section */}
      {kpis.length > 0 && (
        <section>
          <h2 className="section-title">This month</h2>
          <div className={`card overflow-hidden grid grid-cols-2 ${kpiCols} divide-x divide-y lg:divide-y-0 divide-gray-100`}>
            {kpis.map(k => <Kpi key={k.label} {...k} />)}
          </div>
        </section>
      )}

      {/* Recent activity */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Recent activity</h2>
            <p className="text-xs text-gray-500 mt-0.5">Latest updates across the property</p>
          </div>
          <Link to={R.activity} className="text-sm font-medium text-lango-primary hover:underline shrink-0">View all</Link>
        </div>
        {activity.length === 0 ? (
          <EmptyState icon={FileClock} title="No activity yet today" description="Visitors, deliveries and incidents will appear here as they happen." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {activity.map(a => (
              <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${a.tone}`}><a.icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{a.title}</p><p className="text-xs text-gray-500 truncate">{a.sub}</p></div>
                <p className="text-xs text-gray-400 shrink-0 tabular-nums">{format(a.ts, 'h:mm a')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
