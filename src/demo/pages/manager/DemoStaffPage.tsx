import { Users } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { StaffStatusBadge } from '../../../components/ui/StatusBadge'

export default function DemoStaffPage() {
  const staff = useDemoStore(s => s.staff)
  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Staff</h1><p className="text-sm text-gray-500">{staff.length} team members.</p></div>
      </div>
      <div className="card divide-y divide-gray-50">
        {staff.map(s => (
          <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-lango-primary/10 flex items-center justify-center text-xs font-semibold text-lango-primary shrink-0">{s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{s.name}</p><p className="text-xs text-gray-500">{s.role}</p></div>
            </div>
            <StaffStatusBadge status={s.status} />
          </div>
        ))}
      </div>
    </div>
  )
}
