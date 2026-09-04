import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { useOccupancyHistory } from '../../hooks/useOccupancyHistory'
import { updateUnitStatus } from '../../services/unitService'
import { canManageUnits } from '../../domain/permissions'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { AppUser, Unit, UnitStatus } from '../../types'

const STATUSES: UnitStatus[] = ['OCCUPIED', 'VACANT', 'RESERVED', 'MAINTENANCE']

export function UnitDetailDrawer({ unit, onClose, onChanged, actor }: {
  unit: Unit | null; onClose: () => void; onChanged: () => void; actor: Pick<AppUser, 'uid' | 'name' | 'role'>
}) {
  const { records, loading } = useOccupancyHistory(unit?.propertyId, unit?.unitId)
  const [busy, setBusy] = useState(false)
  const canManage = canManageUnits(actor.role)

  const setStatus = async (s: UnitStatus) => {
    if (!unit) return
    setBusy(true)
    try { await updateUnitStatus(unit, s, actor); toast.success(`Unit → ${s}`); onChanged() }
    catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={!!unit} onClose={onClose} title={unit ? `Unit ${unit.unitNumber}` : ''}>
      {unit && (
        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between"><span className="text-gray-500">Status</span><UnitStatusBadge status={unit.status} /></div>
          <div className="flex items-center justify-between"><span className="text-gray-500">Current tenant</span><span className="font-medium">{unit.currentTenantName ?? '—'}</span></div>
          {canManage && (
            <div>
              <p className="label">Change status</p>
              <div className="flex gap-2 flex-wrap">
                {STATUSES.map(s => <button key={s} disabled={busy || s === unit.status} onClick={() => setStatus(s)} className="btn-secondary text-xs disabled:opacity-40">{s}</button>)}
              </div>
            </div>
          )}
          <div>
            <p className="label">Previous tenants</p>
            {loading ? <p className="text-xs text-gray-400">Loading…</p> : records.length === 0 ? <p className="text-xs text-gray-400">No history yet.</p> : (
              <div className="divide-y divide-gray-50">
                {records.map(r => (
                  <div key={r.recordId} className="py-2 flex justify-between">
                    <span className="font-medium text-gray-800">{r.tenantName}</span>
                    <span className="text-xs text-gray-500">{format(r.moveInDate.toDate(), 'MMM yyyy')} – {r.moveOutDate ? format(r.moveOutDate.toDate(), 'MMM yyyy') : 'present'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
