import { useMemo, useState } from 'react'
import { Building2, Search } from 'lucide-react'
import { useDemoStore } from '../../store/demoStore'
import { UnitStatusBadge } from '../../../components/ui/StatusBadge'
import { DemoUnitDetailModal } from './DemoUnitDetailModal'
import type { DemoUnit } from '../../data/types'

export default function DemoUnitsPage() {
  const units = useDemoStore(s => s.units)
  const blocks = useDemoStore(s => s.blocks)
  const [tab, setTab] = useState<'blocks' | 'units'>('blocks')
  const [term, setTerm] = useState('')
  const [selected, setSelected] = useState<DemoUnit | null>(null)

  const summaries = useMemo(() => blocks.map(b => {
    const us = units.filter(u => u.blockId === b.id)
    return { block: b, total: us.length, occ: us.filter(u => u.status === 'OCCUPIED').length }
  }), [blocks, units])

  const shownUnits = useMemo(() => {
    const q = term.trim().toLowerCase()
    return units.filter(u => !q || u.unitNumber.toLowerCase().includes(q) || (u.tenantName?.toLowerCase().includes(q) ?? false))
  }, [units, term])

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Blocks &amp; Units</h1><p className="text-sm text-gray-500">{blocks.length} blocks · {units.length} units.</p></div>
      </div>

      <div className="flex gap-2">
        {(['blocks', 'units'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3.5 py-1.5 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-lango-primary text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'}`}>{t}</button>
        ))}
      </div>

      {tab === 'blocks' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {summaries.map(s => (
            <div key={s.block.id} className="card p-4">
              <p className="font-semibold text-gray-900">{s.block.name}</p>
              <p className="text-sm text-gray-500 mt-1">{s.occ}/{s.total} occupied</p>
              <div className="mt-3 h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-lango-primary" style={{ width: `${(s.occ / s.total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input pl-9" placeholder="Search unit or tenant…" value={term} onChange={e => setTerm(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {shownUnits.map(u => (
              <button key={u.id} onClick={() => setSelected(u)} className="card p-4 text-left hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between gap-2"><span className="font-semibold text-gray-900">{u.unitNumber}</span><UnitStatusBadge status={u.status} /></div>
                <p className="text-xs text-gray-500 truncate mt-1">{u.tenantName ?? 'Vacant'}</p>
              </button>
            ))}
          </div>
        </>
      )}

      <DemoUnitDetailModal unit={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
