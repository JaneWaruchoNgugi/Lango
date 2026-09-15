import { useState } from 'react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../store/demoStore'
import { Modal } from '../../components/ui/Modal'
import type { DemoVisitType } from '../data/types'

const TYPE_OPTIONS: { value: DemoVisitType; label: string }[] = [
  { value: 'FRIENDLY_VISIT', label: 'Personal visit' },
  { value: 'WORK', label: 'Work' },
  { value: 'SERVICE_PROVIDER', label: 'Service provider' },
  { value: 'DELIVERY', label: 'Delivery' },
]

export function DemoRegisterVisitorForm({ onClose }: { onClose: () => void }) {
  const registerVisitor = useDemoStore(s => s.registerVisitor)
  const units = useDemoStore(s => s.units)
  const [name, setName] = useState('')
  const [unitNumber, setUnitNumber] = useState(units[0]?.unitNumber ?? '')
  const [type, setType] = useState<DemoVisitType>('FRIENDLY_VISIT')
  const submit = () => {
    if (name.trim().length < 2) { toast.error('Enter a name'); return }
    registerVisitor({ name, unitNumber, type }); toast.success('Visitor registered'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Register a visitor"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Register</button></>}>
      <div className="space-y-3">
        <div><label className="label">Visitor name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alice Wanjiru" /></div>
        <div><label className="label">Visiting unit</label>
          <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
          </select>
        </div>
        <div><label className="label">Visit type</label>
          <select className="input" value={type} onChange={e => setType(e.target.value as DemoVisitType)}>
            {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}
