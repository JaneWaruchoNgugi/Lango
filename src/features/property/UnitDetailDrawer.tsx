import { useEffect, useState } from 'react'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { useOccupancyHistory } from '../../hooks/useOccupancyHistory'
import { updateUnitStatus } from '../../services/unitService'
import { canManageUnits, canViewTenantAssignment } from '../../domain/permissions'
import { Building2, X, User, RefreshCw, Layers, History, ShieldCheck, type LucideIcon } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { AppUser, Unit, UnitStatus } from '../../types'

const STATUSES: UnitStatus[] = ['OCCUPIED', 'VACANT', 'RESERVED', 'MAINTENANCE']
const floorLabel = (f?: string) => f ?? '—'

export function UnitDetailDrawer({ unit, onClose, onChanged, actor }: {
  unit: Unit | null; onClose: () => void; onChanged: () => void; actor: Pick<AppUser, 'uid' | 'name' | 'role'>
}) {
  const { records, loading } = useOccupancyHistory(unit?.propertyId, unit?.unitId)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<UnitStatus>('VACANT')
  const canManage = canManageUnits(actor.role)
  const showTenant = canViewTenantAssignment(actor.role)

  useEffect(() => { if (unit) setPending(unit.status) }, [unit?.unitId, unit?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!unit) return null

  const save = async () => {
    if (pending === unit.status) { onClose(); return }
    setBusy(true)
    try { await updateUnitStatus(unit, pending, actor); toast.success(`Unit → ${pending}`); onChanged() }
    catch (e) { console.error(e); toast.error('Update failed') } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-lango-primary" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">Unit {unit.unitNumber}</h2>
            <p className="text-sm text-gray-500 truncate">{unit.blockName ?? ''} • {floorLabel(unit.floor)}</p>
          </div>
          <UnitStatusBadge status={pending} />
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left */}
            <div className="space-y-4">
              <InfoRow icon={ShieldCheck} label="Status"><UnitStatusBadge status={pending} /></InfoRow>
              {showTenant && <InfoRow icon={User} label="Current tenant"><span className="font-medium text-gray-900">{unit.currentTenantName ?? '—'}</span></InfoRow>}
              {canManage && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700"><RefreshCw className="w-4 h-4 text-lango-primary" /> Change status</div>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => setPending(s)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors ${pending === s ? 'bg-lango-primary/10 border-lango-primary text-lango-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Unit details</p>
              <Detail icon={Building2} label="Block" value={unit.blockName ?? ''} />
              <Detail icon={Layers} label="Floor" value={floorLabel(unit.floor)} />
              {unit.notes && <Detail icon={History} label="Notes" value={unit.notes} />}
            </div>
          </div>

          {/* Previous tenants — property manager only */}
          {showTenant && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm font-medium text-gray-700"><History className="w-4 h-4 text-lango-primary" /> Previous tenants</div>
              {loading ? <p className="text-xs text-gray-400">Loading…</p> : records.length === 0 ? <p className="text-xs text-gray-400">No history yet.</p> : (
                <div className="divide-y divide-gray-50">
                  {records.map(r => (
                    <div key={r.recordId} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{r.tenantName}</p>
                        <p className="text-xs text-gray-500">{format(r.moveInDate.toDate(), 'MMM yyyy')} – {r.moveOutDate ? format(r.moveOutDate.toDate(), 'MMM yyyy') : 'present'}</p>
                      </div>
                      <span className={`badge text-xs shrink-0 ${r.moveOutDate ? 'badge-gray' : 'badge-green'}`}>{r.moveOutDate ? 'Moved out' : 'Current'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button className="btn-secondary flex-1" onClick={onClose} disabled={busy}>Cancel</button>
          {canManage && (
            <button className="btn-primary flex-1" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-gray-600"><Icon className="w-4 h-4 text-lango-primary" /> {label}</span>
      {children}
    </div>
  )
}

function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-gray-500"><Icon className="w-4 h-4 text-gray-400" /> {label}</span>
      <span className="text-sm font-medium text-gray-900 text-right truncate">{value}</span>
    </div>
  )
}
