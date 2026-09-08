import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { UnitStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { UnitDetailDrawer } from './UnitDetailDrawer'
import { Boxes, Building2, Plus, Search, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Unit } from '../../types'

type BlockStatus = 'OCCUPIED' | 'PARTIAL' | 'VACANT'
const BLOCK_BADGE: Record<BlockStatus, [string, string]> = {
  OCCUPIED: ['badge-green', 'Occupied'],
  PARTIAL: ['badge-orange', 'Partially Occupied'],
  VACANT: ['badge-gray', 'Vacant'],
}

export default function BlocksUnitsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const { units, blocks, loading, reload } = useUnitsWithTenants(user?.propertyId)
  const [selected, setSelected] = useState<Unit | null>(null)
  const [tab, setTab] = useState<'blocks' | 'units'>('blocks')
  const [term, setTerm] = useState('')
  const [blockFilter, setBlockFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const byBlock = useMemo(() => {
    const map = new Map<string, Unit[]>()
    for (const u of units) { if (!map.has(u.blockId)) map.set(u.blockId, []); map.get(u.blockId)!.push(u) }
    return map
  }, [units])

  const blockSummaries = useMemo(() => blocks.map(b => {
    const us = byBlock.get(b.blockId) ?? []
    const occ = us.filter(u => u.status === 'OCCUPIED').length
    const status: BlockStatus = occ === 0 ? 'VACANT' : occ === us.length ? 'OCCUPIED' : 'PARTIAL'
    return { block: b, count: us.length, status }
  }), [blocks, byBlock])

  const q = term.trim().toLowerCase()
  const shownBlocks = blockSummaries.filter(s =>
    (!q || s.block.name.toLowerCase().includes(q)) &&
    (!blockFilter || s.block.blockId === blockFilter) &&
    (!statusFilter || s.status === statusFilter))
  const shownUnits = units.filter(u =>
    (!blockFilter || u.blockId === blockFilter) &&
    (!statusFilter || u.status === statusFilter) &&
    (!q || u.unitNumber.toLowerCase().includes(q) || (u.currentTenantName?.toLowerCase().includes(q) ?? false)))

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Boxes className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Blocks &amp; Units</h1><p className="text-sm text-gray-500">Manage blocks and units in your property.</p></div>
        </div>
        <button className="btn-primary" onClick={() => toast('Blocks are set up by the administrator.')}><Plus className="w-4 h-4" /> Add Block</button>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-gray-100 rounded-xl p-1">
        {(['blocks', 'units'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-lango-primary text-white' : 'text-gray-600'}`}>{t}</button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder={tab === 'blocks' ? 'Search by block name or code…' : 'Search unit or tenant…'} value={term} onChange={e => setTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input sm:w-40" value={blockFilter} onChange={e => setBlockFilter(e.target.value)}>
            <option value="">All blocks</option>
            {blocks.map(b => <option key={b.blockId} value={b.blockId}>{b.name}</option>)}
          </select>
          <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="OCCUPIED">Occupied</option>
            {tab === 'blocks' && <option value="PARTIAL">Partially Occupied</option>}
            <option value="VACANT">Vacant</option>
          </select>
        </div>
      </div>

      {/* Blocks tab */}
      {tab === 'blocks' && (
        shownBlocks.length === 0 ? <EmptyBlocks /> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {shownBlocks.map(s => {
              const [cls, label] = BLOCK_BADGE[s.status]
              return (
                <div key={s.block.blockId} className="card p-4 flex flex-col">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-lango-primary" /></div>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 truncate">{s.block.name}</p><p className="text-xs text-gray-500">{s.count} unit{s.count === 1 ? '' : 's'}</p></div>
                    <span className={`badge ${cls} text-xs shrink-0`}>{label}</span>
                  </div>
                  <button className="btn-secondary w-full mt-4" onClick={() => { setTab('units'); setBlockFilter(s.block.blockId) }}>View Units <ArrowRight className="w-4 h-4" /></button>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Units tab */}
      {tab === 'units' && (
        shownUnits.length === 0 ? <EmptyBlocks label="No units match your filters." /> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shownUnits.map(u => (
              <button key={u.unitId} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900 truncate">{u.unitNumber}</span><UnitStatusBadge status={u.status} /></div>
                <p className="text-xs text-gray-500 mt-1 truncate">{u.currentTenantName ?? 'Vacant'}</p>
              </button>
            ))}
          </div>
        )
      )}

      <UnitDetailDrawer unit={selected} onClose={() => setSelected(null)} onChanged={() => { reload(); setSelected(null) }} actor={actor} />
    </div>
  )
}

function EmptyBlocks({ label = 'Blocks and units are set up by the administrator.' }: { label?: string }) {
  return (
    <div className="card py-14 flex flex-col items-center text-center px-6">
      <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5"><Building2 className="w-12 h-12 text-lango-primary/40" /></div>
      <h3 className="font-bold text-gray-900">No blocks yet</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">{label}</p>
    </div>
  )
}
