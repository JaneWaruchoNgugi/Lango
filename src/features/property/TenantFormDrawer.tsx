import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/LoadingScreen'
import { assignTenantToUnit, updateTenant } from '../../services/tenantService'
import type { AppUser, Tenant, Unit } from '../../types'
import toast from 'react-hot-toast'

const schema = z.object({
  fullName: z.string().min(2, 'Name required'),
  phoneNumber: z.string().min(9, 'Phone required'),
  whatsappNumber: z.string().optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  nationalId: z.string().optional().or(z.literal('')),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  isOpen: boolean
  onClose: () => void
  onDone: () => void
  actor: Pick<AppUser, 'uid' | 'name' | 'role'>
  propertyId: string
  vacantUnits: Unit[]
  editing?: Tenant | null
}

export function TenantFormDrawer({ isOpen, onClose, onDone, actor, propertyId, vacantUnits, editing }: Props) {
  const [unitId, setUnitId] = useState('')
  const [busy, setBusy] = useState(false)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { fullName: editing.fullName, phoneNumber: editing.phoneNumber, whatsappNumber: editing.whatsappNumber, email: editing.email ?? '', nationalId: editing.nationalId ?? '', notes: editing.notes ?? '' }
      : {},
  })

  const submit = async (d: FormData) => {
    setBusy(true)
    try {
      if (editing) {
        await updateTenant(editing, { fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber: d.whatsappNumber || d.phoneNumber, email: d.email, nationalId: d.nationalId, notes: d.notes }, actor)
        toast.success('Tenant updated')
      } else {
        const unit = vacantUnits.find(u => u.unitId === unitId)
        if (!unit) { toast.error('Select a vacant unit'); setBusy(false); return }
        await assignTenantToUnit({ propertyId, actor, unit, fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber: d.whatsappNumber || d.phoneNumber, email: d.email, nationalId: d.nationalId, moveInDate: new Date(), notes: d.notes })
        toast.success('Tenant added')
      }
      onDone(); onClose(); form.reset(); setUnitId('')
    } catch (e) { console.error(e); toast.error('Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit tenant' : 'Add tenant'}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
        {!editing && (
          <div>
            <label className="label">Assign to vacant unit *</label>
            <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)}>
              <option value="">Select unit…</option>
              {vacantUnits.map(u => <option key={u.unitId} value={u.unitId}>{u.blockName} — {u.unitNumber}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Full name *</label><input className="input" {...form.register('fullName')} />{form.formState.errors.fullName && <p className="form-error">{form.formState.errors.fullName.message}</p>}</div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone *</label><input className="input" {...form.register('phoneNumber')} />{form.formState.errors.phoneNumber && <p className="form-error">{form.formState.errors.phoneNumber.message}</p>}</div>
          <div><label className="label">WhatsApp</label><input className="input" {...form.register('whatsappNumber')} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Email</label><input className="input" {...form.register('email')} />{form.formState.errors.email && <p className="form-error">{form.formState.errors.email.message}</p>}</div>
          <div><label className="label">National ID</label><input className="input" {...form.register('nationalId')} /></div>
        </div>
        <div><label className="label">Notes</label><textarea rows={2} className="input resize-none" {...form.register('notes')} /></div>
        <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">{busy && <Spinner size="sm" className="text-white" />}{editing ? 'Save changes' : 'Add tenant'}</button>
      </form>
    </Modal>
  )
}
