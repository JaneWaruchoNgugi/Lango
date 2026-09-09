import { useEffect, useMemo, useState } from 'react'
import { Building2, Home, CheckCircle2 } from 'lucide-react'
import { useTenantSearch } from '../../hooks/useTenantSearch'
import { isAccessAllowedNow } from '../../services/preApprovalService'
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect'
import type { Tenant, PreApprovedVisitor } from '../../types'

interface Props {
  propertyId: string
  /** Currently selected unit (the source of truth lives in the parent form). */
  selectedUnitId?: string | null
  onSelectTenant: (t: Tenant) => void
  onSelectPreApproved: (p: PreApprovedVisitor) => void
  /** Called when the block changes, invalidating any prior unit/tenant choice. */
  onClear?: () => void
}

/**
 * Two cascading, type-ahead selectors for the "Who are you visiting?" step:
 * pick a block, then a unit. The unit list only shows OCCUPIED units in the
 * chosen block (derived from the active-tenant list). Selecting a unit resolves
 * its tenant; any pre-approved visitors for that unit are offered as shortcuts.
 */
export function TenantSearchField({ propertyId, selectedUnitId, onSelectTenant, onSelectPreApproved, onClear }: Props) {
  const { tenants, preApproved, loading } = useTenantSearch(propertyId)
  const [blockId, setBlockId] = useState<string | null>(null)

  const selectedTenant = useMemo(
    () => tenants.find(t => t.unitId === selectedUnitId) ?? null,
    [tenants, selectedUnitId])

  // If a unit is pre-selected (e.g. returning to this step), reflect its block.
  useEffect(() => { if (selectedTenant) setBlockId(selectedTenant.blockId) }, [selectedTenant])

  const blockOptions = useMemo<SelectOption[]>(() => {
    const byId = new Map<string, string>()
    tenants.forEach(t => byId.set(t.blockId, t.blockName))
    return [...byId].map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [tenants])

  const unitOptions = useMemo<SelectOption[]>(() => {
    if (!blockId) return []
    return tenants.filter(t => t.blockId === blockId)
      .map(t => ({ value: t.unitId, label: `Unit ${t.unitNumber}`, sublabel: t.fullName }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
  }, [tenants, blockId])

  const unitPreApproved = useMemo(
    () => (selectedUnitId ? preApproved.filter(p => p.unitId === selectedUnitId) : []),
    [preApproved, selectedUnitId])

  const handleBlock = (value: string) => { setBlockId(value); onClear?.() }
  const handleUnit = (value: string) => {
    const t = tenants.find(x => x.unitId === value)
    if (t) onSelectTenant(t)
  }

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <SearchableSelect
          icon={Building2} value={blockId} options={blockOptions} onChange={handleBlock}
          disabled={loading} placeholder={loading ? 'Loading blocks…' : 'Select block'}
          searchPlaceholder="Search blocks…" emptyText="No blocks with tenants" />
        <SearchableSelect
          icon={Home} value={selectedUnitId ?? null} options={unitOptions} onChange={handleUnit}
          disabled={!blockId} placeholder={blockId ? 'Select unit' : 'Select a block first'}
          searchPlaceholder="Search occupied units…" emptyText="No occupied units in this block" />
      </div>

      {selectedTenant && (
        <p className="text-xs text-green-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Visiting {selectedTenant.fullName} · {selectedTenant.blockName} Unit {selectedTenant.unitNumber}
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
