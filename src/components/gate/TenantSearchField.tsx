import { Search, CheckCircle2 } from 'lucide-react'
import { useTenantSearch } from '../../hooks/useTenantSearch'
import { isAccessAllowedNow } from '../../services/preApprovalService'
import type { Tenant, PreApprovedVisitor } from '../../types'

interface Props {
  propertyId: string
  onSelectTenant: (t: Tenant) => void
  onSelectPreApproved: (p: PreApprovedVisitor) => void
  selectedLabel?: string
}

export function TenantSearchField({ propertyId, onSelectTenant, onSelectPreApproved, selectedLabel }: Props) {
  const { term, setTerm, results, preApprovedMatches, loading } = useTenantSearch(propertyId)
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="input pl-9" placeholder="Search tenant, unit, block or phone…"
          value={term} onChange={e => setTerm(e.target.value)} />
      </div>
      {selectedLabel && <p className="text-xs text-green-700">✓ {selectedLabel}</p>}
      {loading && <p className="text-xs text-gray-400">Loading tenants…</p>}

      {preApprovedMatches.map(p => {
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

      {term && results.length === 0 && preApprovedMatches.length === 0 && (
        <p className="text-xs text-gray-400">No tenant found. You can still register against a unit below.</p>
      )}
      {results.slice(0, 8).map(t => (
        <button key={t.tenantId} type="button" onClick={() => onSelectTenant(t)}
          className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-lango-primary">
          <p className="text-sm font-medium text-gray-900">{t.fullName}</p>
          <p className="text-xs text-gray-500">{t.blockName} • Unit {t.unitNumber} • {t.phoneNumber}</p>
        </button>
      ))}
    </div>
  )
}
