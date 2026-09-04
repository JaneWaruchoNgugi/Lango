import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { UnitDetailDrawer } from './UnitDetailDrawer'
import { Building } from 'lucide-react'
import type { Unit } from '../../types'

export default function BlocksUnitsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const { units, blocks, loading, reload } = useUnitsWithTenants(user?.propertyId)
  const [selected, setSelected] = useState<Unit | null>(null)

  const byBlock = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const u of units) { const k = u.blockId; if (!map.has(k)) map.set(k, []); map.get(k)!.push(u) }
    return map
  }, [units])
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="page-title">Blocks & Units</h1>
      {units.length === 0 ? <EmptyState icon={Building} title="No units" description="Blocks and units are set up by the Super Admin." /> : (
        blocks.map(b => (
          <div key={b.blockId} className="space-y-2">
            <h3 className="section-title">{b.name}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {(byBlock.get(b.blockId) ?? []).map(u => (
                <button key={u.unitId} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-card-hover">
                  <div className="flex items-center justify-between"><span className="font-semibold text-gray-900">{u.unitNumber}</span><UnitStatusBadge status={u.status} /></div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{u.currentTenantName ?? 'Vacant'}</p>
                </button>
              ))}
            </div>
          </div>
        ))
      )}
      <UnitDetailDrawer unit={selected} onClose={() => setSelected(null)} onChanged={() => { reload(); setSelected(null) }} actor={actor} />
    </div>
  )
}
