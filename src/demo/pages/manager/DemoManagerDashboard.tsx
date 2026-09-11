import { Users, DoorOpen, CalendarClock, ShieldAlert, LogIn, LogOut, Package, AlertTriangle, UserCheck, type LucideIcon } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from '../../store/demoStore'
import type { DemoActivityKind } from '../../data/types'

function Stat({ icon: Icon, label, value, tint }: { icon: LucideIcon; label: string; value: number; tint: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tint}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  )
}

const ACTIVITY_ICON: Record<DemoActivityKind, LucideIcon> = {
  CHECK_IN: LogIn, CHECK_OUT: LogOut, DELIVERY: Package, INCIDENT: AlertTriangle, APPROVAL: UserCheck,
}
const ACTIVITY_TINT: Record<DemoActivityKind, string> = {
  CHECK_IN: 'bg-green-100 text-green-600', CHECK_OUT: 'bg-gray-100 text-gray-600',
  DELIVERY: 'bg-orange-100 text-orange-600', INCIDENT: 'bg-red-100 text-red-600', APPROVAL: 'bg-blue-100 text-blue-600',
}

export default function DemoManagerDashboard() {
  const state = useDemoStore()
  const inside = selectCurrentlyInside(state)
  const open = selectOpenIncidents(state)
  const visitorsToday = selectVisitorsToday(state)
  const expected = selectExpectedToday(state)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
        <p className="text-sm text-gray-500">{state.property.name} · {state.property.location}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <Stat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <Stat icon={CalendarClock} label="Expected Today" value={expected} tint="bg-purple-100 text-purple-600" />
        <Stat icon={ShieldAlert} label="Open Incidents" value={open} tint="bg-red-100 text-red-600" />
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent Activity</h2>
        <div className="divide-y divide-gray-50">
          {state.activity.map(a => {
            const Icon = ACTIVITY_ICON[a.kind]
            return (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ACTIVITY_TINT[a.kind]}`}><Icon className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                  <p className="text-xs text-gray-500 truncate">{a.subtitle}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">{a.timeLabel}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
