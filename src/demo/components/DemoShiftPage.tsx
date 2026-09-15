import { useDemoStore } from '../store/demoStore'
import { DemoShiftPanel } from './DemoShiftPanel'

export default function DemoShiftPage({ staffId }: { staffId: string }) {
  const staffName = useDemoStore(s => s.staff.find(m => m.id === staffId)?.name ?? 'Staff member')
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My shift</h1>
        <p className="text-sm text-gray-500">Clock in when you arrive; clock out when you leave. Your status shows on the manager's activity feed.</p>
      </div>
      <DemoShiftPanel staffId={staffId} staffName={staffName} />
    </div>
  )
}
