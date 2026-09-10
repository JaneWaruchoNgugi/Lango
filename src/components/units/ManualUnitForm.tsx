import { useState } from 'react'
import { createUnit } from '../../services/unitService'
import type { AppUser } from '../../types'
import toast from 'react-hot-toast'

interface Props {
  propertyId: string
  blockId?: string | null
  blockName?: string | null
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  onCreated: () => void
}

export function ManualUnitForm({ propertyId, blockId, blockName, actor, onCreated }: Props) {
  const [unitCode, setUnitCode] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [floor, setFloor] = useState('')
  const [unitType, setUnitType] = useState('')
  const [status, setStatus] = useState<'VACANT' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE'>('VACANT')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      await createUnit({
        propertyId, unitCode,
        displayName: displayName || undefined,
        blockId: blockId ?? null, blockName: blockName ?? null,
        floor: floor || undefined, unitType: unitType || undefined, status,
      }, actor)
      toast.success('Unit created')
      setUnitCode(''); setDisplayName(''); setFloor(''); setUnitType('')
      onCreated()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create unit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <div><label className="label">Unit Code *</label>
        <input className="input" value={unitCode} onChange={(e) => setUnitCode(e.target.value)} placeholder="e.g. A-101, PH01, Villa 12" /></div>
      <div><label className="label">Display Name</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Defaults to unit code" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Floor</label>
          <input className="input" value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="optional" /></div>
        <div><label className="label">Unit Type</label>
          <input className="input" value={unitType} onChange={(e) => setUnitType(e.target.value)} placeholder="optional" /></div>
      </div>
      <div><label className="label">Status</label>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="VACANT">Vacant</option>
          <option value="OCCUPIED">Occupied</option>
          <option value="RESERVED">Reserved</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select></div>
      <button className="btn-primary" disabled={busy || !unitCode.trim()} onClick={submit}>
        {busy ? 'Saving…' : 'Save Unit'}
      </button>
    </div>
  )
}
