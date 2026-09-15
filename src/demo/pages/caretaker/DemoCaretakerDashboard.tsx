import { Link } from 'react-router-dom'
import { DoorOpen, UserPlus } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { DemoShiftPanel } from '../../components/DemoShiftPanel'
import { DemoActivityFeed } from '../../components/DemoActivityFeed'
import { CARETAKER_STAFF_ID } from '../../data/personas'

export default function DemoCaretakerDashboard() {
  const caretakerName = useDemoStore(s => s.staff.find(m => m.id === CARETAKER_STAFF_ID)?.name ?? 'Caretaker')
  const activity = useDemoStore(s => s.activity)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hi, {caretakerName} 👋</h1>
        <p className="text-sm text-gray-500">Greenview Apartments · Caretaker</p>
      </div>

      <DemoShiftPanel staffId={CARETAKER_STAFF_ID} staffName={caretakerName} />

      <div className="flex flex-wrap gap-2">
        <Link to="/demo/caretaker/register" className="btn-primary"><UserPlus className="w-4 h-4" /> Register visitor</Link>
        <Link to="/demo/caretaker/inside" className="btn-secondary"><DoorOpen className="w-4 h-4" /> Currently inside</Link>
      </div>

      <div className="card p-5">
        <h2 className="section-title">Recent activity</h2>
        <DemoActivityFeed activity={activity} limit={6} />
      </div>
    </div>
  )
}
