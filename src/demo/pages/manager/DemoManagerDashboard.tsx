import { Users, DoorOpen, CalendarClock, ShieldAlert, PlayCircle } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectOpenIncidents, selectVisitorsToday, selectExpectedToday } from '../../store/demoStore'
import { DemoStat } from '../../components/DemoStat'
import { DemoActivityFeed } from '../../components/DemoActivityFeed'
import { useDemoTour } from '../../tour/DemoTourContext'

export default function DemoManagerDashboard() {
  const property = useDemoStore(s => s.property)
  const activity = useDemoStore(s => s.activity)
  const inside = useDemoStore(selectCurrentlyInside)
  const open = useDemoStore(selectOpenIncidents)
  const visitorsToday = useDemoStore(selectVisitorsToday)
  const expected = useDemoStore(selectExpectedToday)
  const { start } = useDemoTour()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Good afternoon, Mercy Njeri 👋</h1>
          <p className="text-sm text-gray-500">{property.name} · {property.location}</p>
        </div>
        <button onClick={start} className="inline-flex items-center gap-1.5 text-sm font-medium text-lango-primary hover:underline shrink-0">
          <PlayCircle className="w-4 h-4" /> Take the guided tour
        </button>
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
