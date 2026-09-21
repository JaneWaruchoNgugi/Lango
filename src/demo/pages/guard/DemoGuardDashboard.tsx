import { Link } from 'react-router-dom'
import { Users, DoorOpen, CalendarClock, UserCheck, UserPlus } from 'lucide-react'
import { useDemoStore, selectCurrentlyInside, selectVisitorsToday, selectExpectedToday, selectPendingApprovals } from '../../store/demoStore'
import { DemoStat } from '../../components/DemoStat'
import { DemoShiftPanel } from '../../components/DemoShiftPanel'
import { DemoCurrentlyInside } from '../../components/DemoCurrentlyInside'
import { GUARD_STAFF_ID } from '../../data/personas'

export default function DemoGuardDashboard() {
  const guardName = useDemoStore(s => s.staff.find(m => m.id === GUARD_STAFF_ID)?.name ?? 'Guard')
  const inside = useDemoStore(selectCurrentlyInside)
  const visitorsToday = useDemoStore(selectVisitorsToday)
  const expected = useDemoStore(selectExpectedToday)
  const pending = useDemoStore(selectPendingApprovals).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Good day, {guardName} 👋</h1>
        <p className="text-sm text-gray-500">Greenview Apartments · Security Gate</p>
      </div>

      <DemoShiftPanel staffId={GUARD_STAFF_ID} staffName={guardName} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <DemoStat icon={Users} label="Visitors Today" value={visitorsToday} tint="bg-blue-100 text-blue-600" />
        <DemoStat icon={DoorOpen} label="Currently Inside" value={inside} tint="bg-green-100 text-green-600" />
        <DemoStat icon={CalendarClock} label="Expected" value={expected} tint="bg-purple-100 text-purple-600" />
        <DemoStat icon={UserCheck} label="Pending Approval" value={pending} tint="bg-amber-100 text-amber-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Link to="/demo/guard/register" className="btn-primary"><UserPlus className="w-4 h-4" /> Register visitor</Link>
        <Link to="/demo/guard/inside" className="btn-secondary"><DoorOpen className="w-4 h-4" /> Currently inside</Link>
      </div>

      <div>
        <h2 className="section-title">Currently inside</h2>
        <DemoCurrentlyInside />
      </div>
    </div>
  )
}
