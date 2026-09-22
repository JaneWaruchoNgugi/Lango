import { LogIn, LogOut, Package, AlertTriangle, UserCheck, Clock, type LucideIcon } from 'lucide-react'
import type { DemoActivity, DemoActivityKind } from '../data/types'

const ACTIVITY_ICON: Record<DemoActivityKind, LucideIcon> = {
  CHECK_IN: LogIn, CHECK_OUT: LogOut, DELIVERY: Package, INCIDENT: AlertTriangle, APPROVAL: UserCheck, SHIFT: Clock,
}
const ACTIVITY_TINT: Record<DemoActivityKind, string> = {
  CHECK_IN: 'bg-green-100 text-green-600', CHECK_OUT: 'bg-gray-100 text-gray-600',
  DELIVERY: 'bg-orange-100 text-orange-600', INCIDENT: 'bg-red-100 text-red-600',
  APPROVAL: 'bg-blue-100 text-blue-600', SHIFT: 'bg-gray-100 text-gray-600',
}

export function DemoActivityFeed({ activity, limit }: { activity: DemoActivity[]; limit?: number }) {
  const rows = limit ? activity.slice(0, limit) : activity
  return (
    <div className="divide-y divide-gray-50">
      {rows.map(a => {
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
  )
}
