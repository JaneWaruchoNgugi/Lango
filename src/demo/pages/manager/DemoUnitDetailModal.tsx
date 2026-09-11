import { Modal } from '../../../components/ui/Modal'
import { UnitStatusBadge } from '../../../components/ui/StatusBadge'
import { useDemoStore } from '../../store/demoStore'
import type { DemoUnit } from '../../data/types'

export function DemoUnitDetailModal({ unit, onClose }: { unit: DemoUnit | null; onClose: () => void }) {
  const visitors = useDemoStore(s => s.visitors)
  const deliveries = useDemoStore(s => s.deliveries)
  if (!unit) return null
  const unitVisitors = visitors.filter(v => v.unitNumber === unit.unitNumber)
  const unitDeliveries = deliveries.filter(d => d.unitNumber === unit.unitNumber)

  return (
    <Modal isOpen onClose={onClose} title={`Unit ${unit.unitNumber}`}>
      <div className="space-y-4 text-sm">
        <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><UnitStatusBadge status={unit.status} /></div>
        <div className="flex items-center justify-between"><span className="text-gray-500">Current tenant</span><span className="font-medium">{unit.tenantName ?? '—'}</span></div>

        <div>
          <p className="text-gray-500 mb-1">Previous tenants</p>
          {unit.previousTenants.length ? unit.previousTenants.map(p => <p key={p} className="font-medium text-gray-800">{p}</p>) : <p className="text-gray-400">None on record</p>}
        </div>

        <div>
          <p className="text-gray-500 mb-1">Recent visitors</p>
          {unitVisitors.length ? unitVisitors.map(v => <p key={v.id} className="text-gray-800">{v.name} · {v.status === 'INSIDE' ? 'Inside' : 'Checked out'}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p>) : <p className="text-gray-400">No recent visitors</p>}
        </div>

        <div>
          <p className="text-gray-500 mb-1">Recent deliveries</p>
          {unitDeliveries.length ? unitDeliveries.map(d => <p key={d.id} className="text-gray-800">{d.company} · {d.status === 'COLLECTED' ? 'Collected' : 'Received'}</p>) : <p className="text-gray-400">No recent deliveries</p>}
        </div>
      </div>
    </Modal>
  )
}
