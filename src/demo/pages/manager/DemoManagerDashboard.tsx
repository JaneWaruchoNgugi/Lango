import { Users, DoorOpen, CalendarClock, ShieldAlert } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from '../../store/demoStore'
import { DemoStat } from '../../components/DemoStat'
import { DemoActivityFeed } from '../../components/DemoActivityFeed'

export default function DemoManagerDashboard() {
  const property = useDemoStore(s => s.property)
  const activity = useDemoStore(s => s.activity)
  const inside = useDemoStore(selectCurrentlyInside)
  const open = useDemoStore(selectOpenIncidents)
  const visitorsToday = useDemoStore(selectVisitorsToday)
  const expected = useDemoStore(selectExpectedToday)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
        <p className="text-sm text-gray-500">{property.name} · {property.location}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoStat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <DemoStat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <DemoStat icon={CalendarClock} label="Expected Today" value={expected} tint="bg-purple-100 text-purple-600" />
        <DemoStat icon={ShieldAlert} label="Open Incidents" value={open} tint="bg-red-100 text-red-600" />
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent Activity</h2>
        <DemoActivityFeed activity={activity} />
      </div>
    </div>
  )
}
