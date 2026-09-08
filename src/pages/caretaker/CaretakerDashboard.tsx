import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import {
  UserPlus, Package, Users, AlertTriangle, CalendarDays, Clock, ChevronRight,
  LogIn, LogOut, FileClock, type LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { VISIT_TYPE_LABEL } from '../../domain/visitTypes'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { useShift } from '../../hooks/useShift'
import { startShift as startShiftService, endShift as endShiftService } from '../../services/shiftService'
import type { Delivery, Incident, PreApprovedVisitor, UserRole } from '../../types'

function routesFor(role: UserRole | null | undefined) {
  if (role === 'SECURITY_GUARD') return { register: '/gate/register', deliveries: '/gate/deliveries', inside: '/gate/inside', incidents: '/gate/incidents', activity: '/gate/inside' }
  const b = role === 'PROPERTY_MANAGER' ? '/property' : '/caretaker'
  return { register: `${b}/register`, deliveries: `${b}/deliveries`, inside: `${b}/visitors`, incidents: `${b}/incidents`, activity: `${b}/visitors` }
}

function StatCard({ to, icon: Icon, value, label, tone }: { to: string; icon: LucideIcon; value: number; label: string; tone: string }) {
  return (
    <Link to={to} className="card p-4 flex flex-col hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-5 h-5" /></div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3 leading-none">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Link>
  )
}

function ActionCard({ to, icon: Icon, title, subtitle }: { to: string; icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <Link to={to} className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-lango-primary/10 flex items-center justify-center shrink-0"><Icon className="w-5 h-5 text-lango-primary" /></div>
      <div className="flex-1 min-w-0"><p className="font-semibold text-sm text-gray-900 truncate">{title}</p><p className="text-xs text-gray-500 truncate">{subtitle}</p></div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
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

  const { visitors: currentVisitors } = useCurrentVisitors(propertyId)
  const { shift } = useShift(user?.uid)
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
    ...incidents.map(i => ({ id: i.incidentId, title: 'Incident reported', sub: `${i.type.replace(/_/g, ' ')}`, ts: i.createdAt.toDate(), icon: AlertTriangle, tone: 'bg-red-50 text-red-500' })),
  ].sort((a, b) => b.ts.getTime() - a.ts.getTime()).slice(0, 6)

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Greeting + date chip */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-lango-primary/10 flex items-center justify-center text-lango-primary font-semibold shrink-0">{(firstName[0] ?? 'U').toUpperCase()}</div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{greeting}, {firstName} 👋</h1>
            <p className="text-sm text-gray-500">Here's your property overview for today.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-lango-primary/5 px-4 py-2">
          <CalendarDays className="w-5 h-5 text-lango-primary" />
          <div className="leading-tight"><p className="text-xs text-gray-500">{format(now, 'EEE, d MMM yyyy')}</p><p className="text-sm font-semibold text-gray-900 tabular-nums">{format(now, 'h:mm a')}</p></div>
        </div>
      </div>

      {/* Shift banner — guards start/end their shift here */}
      {isGuard && (
        <div className={`card p-4 flex items-center justify-between ${shift ? 'bg-green-50 border-green-100' : ''}`}>
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <p className="text-sm font-semibold text-gray-900">{shift ? 'On Shift' : 'Not on Shift'}</p>
              {shift && <p className="text-xs text-gray-500">Started {format(shift.startTime.toDate(), 'h:mm a')}</p>}
            </div>
          </div>
          <button onClick={handleShift} disabled={shiftLoading} className={shift ? 'btn-secondary text-sm' : 'btn-primary text-sm'}>
            {shiftLoading ? '…' : shift ? <><LogOut className="w-3.5 h-3.5" /> End Shift</> : <><LogIn className="w-3.5 h-3.5" /> Start Shift</>}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard to={R.inside} icon={Users} value={visitorsToday} label="Visitors Today" tone="bg-blue-50 text-blue-600" />
        <StatCard to={R.inside} icon={Users} value={currentVisitors.length} label="Currently Inside" tone="bg-green-50 text-green-600" />
        <StatCard to={R.inside} icon={CalendarDays} value={expectedToday} label="Expected Today" tone="bg-indigo-50 text-indigo-600" />
        <StatCard to={R.incidents} icon={AlertTriangle} value={incidents.length} label="Open Incidents" tone="bg-orange-50 text-orange-500" />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={R.register} className="col-span-2 lg:col-span-1 flex items-center gap-4 p-5 rounded-2xl bg-lango-primary text-white hover:bg-lango-secondary transition-colors">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><UserPlus className="w-6 h-6" /></div>
          <div className="flex-1"><p className="font-semibold">Register Visitor</p><p className="text-white/70 text-sm">Register a new guest</p></div>
          <ChevronRight className="w-5 h-5 text-white/70" />
        </Link>
        <ActionCard to={R.deliveries} icon={Package} title="Delivery Check-in" subtitle="Today's deliveries" />
        <ActionCard to={R.inside} icon={Users} title="Currently Inside" subtitle="View all inside" />
        <ActionCard to={R.incidents} icon={AlertTriangle} title="Report Incident" subtitle="Security & safety" />
      </div>

      {/* Recent activity */}
      <div className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-lango-primary/10 flex items-center justify-center"><Clock className="w-4 h-4 text-lango-primary" /></div>
            <div><h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3><p className="text-xs text-gray-500">Latest updates across the property</p></div>
          </div>
          <Link to={R.activity} className="text-xs font-medium text-lango-primary shrink-0">View all</Link>
        </div>
        {activity.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center px-6">
            <div className="relative w-24 h-24 rounded-full bg-lango-primary/5 flex items-center justify-center mb-4"><FileClock className="w-11 h-11 text-lango-primary/40" /></div>
            <h4 className="font-semibold text-gray-900">No activity yet today.</h4>
            <p className="text-sm text-gray-500 mt-1 max-w-sm">Updates will appear here as events happen in the property.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activity.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${a.tone}`}><a.icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900 truncate">{a.title}</p><p className="text-xs text-gray-500 truncate">{a.sub}</p></div>
                <p className="text-xs text-gray-400 shrink-0">{format(a.ts, 'h:mm a')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
