import { useState } from 'react'
import { generateUnitCodes } from '../../utils/units'
import { createUnitsBatch } from '../../services/unitService'
import type { AppUser } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  propertyId: string
  blockId?: string | null
  blockName?: string | null
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  onCreated: () => void
}

export function GenerateUnitsForm({ propertyId, blockId, blockName, actor, onCreated }: Props) {
  const [prefix, setPrefix] = useState('')
  const [start, setStart] = useState(1)
  const [count, setCount] = useState(1)
  const [padding, setPadding] = useState(2)
  const [floor, setFloor] = useState('')
  const [unitType, setUnitType] = useState('')
  const [busy, setBusy] = useState(false)

  const preview = generateUnitCodes({ prefix, start, count: Math.min(Math.max(count, 0), 500), padding })

  async function submit() {
    setBusy(true)
    try {
      const n = await createUnitsBatch(
        preview.map((code) => ({
          propertyId, unitCode: code,
          blockId: blockId ?? null, blockName: blockName ?? null,
          floor: floor || undefined, unitType: unitType || undefined,
        })),
        actor,
      )
      toast.success(`${n} units created`)
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create units')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div><label className="label">Prefix</label>
          <input className="input" value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="A- (optional)" /></div>
        <div><label className="label">Start #</label>
          <input className="input" type="number" value={start} onChange={(e) => setStart(Number(e.target.value))} /></div>
        <div><label className="label">Count</label>
          <input className="input" type="number" min="1" value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
        <div><label className="label">Leading zeros</label>
          <input className="input" type="number" min="0" value={padding} onChange={(e) => setPadding(Number(e.target.value))} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Floor (optional)</label>
          <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. Ground" /></div>
        <div><label className="label">Unit type (optional)</label>
          <input className="input" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="e.g. 2 Bedroom" /></div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-blue-50/40 p-3">
        <p className="text-xs font-medium text-gray-600 mb-1">Preview ({preview.length}{count > 500 ? ' — capped at 500' : ''})</p>
        {preview.length === 0
          ? <p className="text-sm text-gray-500">Enter a count of 1 or more to preview unit codes.</p>
          : <p className="text-sm text-gray-800 break-words">{preview.slice(0, 30).join(', ')}{preview.length > 30 ? ' …' : ''}</p>}
      </div>
      <button className="btn-primary" disabled={busy || preview.length === 0} onClick={submit}>
        {busy ? 'Creating…' : `Create ${preview.length} Units`}
      </button>
    </div>
  )
}
