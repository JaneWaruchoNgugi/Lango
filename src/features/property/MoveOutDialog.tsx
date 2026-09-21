import { useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { tsToInputDate, inputDateToDate } from '../../utils/format'
import type { Tenant } from '../../types'

interface Props {
  tenant: Tenant | null
  loading: boolean
  onClose: () => void
  onConfirm: (moveOutDate: Date) => void
}

export function MoveOutDialog({ tenant, loading, onClose, onConfirm }: Props) {
  const [date, setDate] = useState(() => tsToInputDate(new Date()))
  if (!tenant) return null
  return (
    <Modal
      isOpen={!!tenant}
      onClose={onClose}
      title="Move out tenant"
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={() => onConfirm(inputDateToDate(date))} className="btn-danger" disabled={loading || !date}>
            {loading ? 'Please wait...' : 'Move out'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600">Move <span className="font-medium">{tenant.fullName}</span> out of {tenant.unitNumber}? The unit becomes vacant; history is preserved.</p>
      <div className="mt-4">
        <label className="label">Vacate date</label>
        <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
      </div>
    </Modal>
  )
}
