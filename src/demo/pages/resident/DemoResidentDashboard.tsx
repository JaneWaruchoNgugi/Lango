import { Home, Package, DoorOpen } from 'lucide-react'
import { useDemoStore, selectInsideVisitors } from '../../store/demoStore'
import { DemoPendingApprovals } from '../../components/DemoPendingApprovals'
import { DemoDeliveryBadge } from '../../components/DemoBadges'
import { RESIDENT_UNIT } from '../../data/personas'

export default function DemoResidentDashboard() {
  const residentName = useDemoStore(s => s.tenants.find(t => t.unitNumber === RESIDENT_UNIT)?.name ?? 'Resident')
  const myVisitors = useDemoStore(selectInsideVisitors).filter(v => v.unitNumber === RESIDENT_UNIT)
  const myDeliveries = useDemoStore(s => s.deliveries.filter(d => d.unitNumber === RESIDENT_UNIT))

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Home className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Welcome, {residentName} 👋</h1><p className="text-sm text-gray-500">Apartment {RESIDENT_UNIT} · Greenview Apartments</p></div>
      </div>

      <div>
        <h2 className="section-title">Visitor requests</h2>
        <DemoPendingApprovals unitNumber={RESIDENT_UNIT} />
      </div>

      <div>
        <h2 className="section-title">Currently visiting you</h2>
        <div className="card divide-y divide-gray-50">
          {myVisitors.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No visitors inside right now.</div>}
          {myVisitors.map(v => (
            <div key={v.id} className="px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><DoorOpen className="w-4 h-4" /></div>
              <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{v.name}</p><p className="text-xs text-gray-500 truncate">{v.type.replace(/_/g, ' ').toLowerCase()}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p></div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="section-title">Your deliveries</h2>
        <div className="card divide-y divide-gray-50">
          {myDeliveries.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No deliveries expected.</div>}
          {myDeliveries.map(d => (
            <div key={d.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0"><Package className="w-4 h-4" /></div>
                <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{d.company}</p><p className="text-xs text-gray-500 truncate">{d.expectedLabel}</p></div>
              </div>
              <DemoDeliveryBadge status={d.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
