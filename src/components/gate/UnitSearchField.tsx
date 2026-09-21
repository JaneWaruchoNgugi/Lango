import { useEffect, useMemo, useState } from 'react'
import { Building2, Home, CheckCircle2 } from 'lucide-react'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { loadPreApproved, isAccessAllowedNow } from '../../services/preApprovalService'
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect'
import type { PreApprovedVisitor } from '../../types'

export interface SelectedUnit {
  unitId: string
  unitNumber: string
  blockId: string | null
  blockName: string | null
}

interface Props {
  propertyId: string
  selectedUnitId?: string | null
  onSelectUnit: (unit: SelectedUnit) => void
  onSelectPreApproved: (p: PreApprovedVisitor) => void
  onClear?: () => void
}

/**
 * Unit-only variant of the "Who are you visiting?" step for caretakers.
 * Derives the block/unit list from the units collection — no tenant names exposed.
 * Pre-approved visitor shortcuts are still shown since they don't reveal tenant identity.
 */
export function UnitSearchField({ propertyId, selectedUnitId, onSelectUnit, onSelectPreApproved, onClear }: Props) {
  const { units, blocks, loading } = useUnitsWithTenants(propertyId)
  const [preApproved, setPreApproved] = useState<PreApprovedVisitor[]>([])
  const [blockId, setBlockId] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) return
    loadPreApproved(propertyId).then(setPreApproved).catch(err => console.error('[UnitSearchField]', err))
  }, [propertyId])

  // Re-align blockId when a unit is externally pre-selected.
  useEffect(() => {
    if (!selectedUnitId) return
    const unit = units.find(u => u.unitId === selectedUnitId)
    if (unit) setBlockId(unit.blockId ?? null)
  }, [selectedUnitId, units])

  const blockOptions = useMemo<SelectOption[]>(() =>
    blocks.map(b => ({ value: b.blockId, label: b.name }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
    [blocks])

  const unitOptions = useMemo<SelectOption[]>(() => {
    if (!blockId) return []
    return units
      .filter(u => u.blockId === blockId && u.status === 'OCCUPIED')
      .map(u => ({ value: u.unitId, label: `Unit ${u.unitNumber}` }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [units, blockId])

  const selectedUnit = useMemo(
    () => units.find(u => u.unitId === selectedUnitId) ?? null,
    [units, selectedUnitId])

  const unitPreApproved = useMemo(
    () => (selectedUnitId ? preApproved.filter(p => p.unitId === selectedUnitId) : []),
    [preApproved, selectedUnitId])

  const handleBlock = (value: string) => { setBlockId(value); onClear?.() }
  const handleUnit = (value: string) => {
    const u = units.find(x => x.unitId === value)
    if (u) onSelectUnit({ unitId: u.unitId, unitNumber: u.unitNumber, blockId: u.blockId ?? null, blockName: u.blockName ?? null })
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <SearchableSelect
          icon={Building2} value={blockId} options={blockOptions} onChange={handleBlock}
          disabled={loading} placeholder={loading ? 'Loading blocks…' : 'Select block'}
          searchPlaceholder="Search blocks…" emptyText="No blocks found" />
        <SearchableSelect
          icon={Home} value={selectedUnitId ?? null} options={unitOptions} onChange={handleUnit}
          disabled={!blockId} placeholder={blockId ? 'Select unit' : 'Select a block first'}
          searchPlaceholder="Search occupied units…" emptyText="No occupied units in this block" />
      </div>

      {selectedUnit && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Visiting {selectedUnit.blockName} Unit {selectedUnit.unitNumber}
        </p>
      )}

      {unitPreApproved.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">Pre-approved visitors for this unit</p>
          {unitPreApproved.map(p => {
            const allowed = isAccessAllowedNow(p)
            return (
              <button key={p.id} type="button" onClick={() => onSelectPreApproved(p)}
                className="w-full text-left p-3 rounded-xl border border-green-200 bg-green-50">
                <p className="text-xs font-semibold text-green-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> PRE-APPROVED</p>
                <p className="text-sm font-medium text-gray-900">{p.name}</p>
                <p className="text-xs text-gray-600">{p.unitNumber} · {p.relationship ?? 'Visitor'}</p>
                <p className={`text-xs mt-1 ${allowed ? 'text-green-700' : 'text-red-600'}`}>
                  {allowed ? '🟢 Access allowed now' : '🔴 Outside access window'} · {p.accessStart}-{p.accessEnd}
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
