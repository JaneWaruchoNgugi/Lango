import { useMemo, useState } from 'react'
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
  const [blockId, setBlockId] = useState('')
  const [unitId, setUnitId] = useState('')
  const [busy, setBusy] = useState(false)

  // Only blocks that actually have vacant units, and the vacant units within the
  // chosen block — both derived from the vacantUnits list (no extra queries).
  const blocks = useMemo(() => {
    const byId = new Map<string, string>()
    // Block-less units bucket under '' and only surface in BLOCKS-layout properties (P1).
    vacantUnits.forEach(u => byId.set(u.blockId ?? '', u.blockName ?? ''))
    return [...byId].map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
  }, [vacantUnits])
  const blockUnits = useMemo(
    () => vacantUnits.filter(u => u.blockId === blockId)
      .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true })),
    [vacantUnits, blockId])
  const [sameWhatsapp, setSameWhatsapp] = useState(
    editing ? (!editing.whatsappNumber || editing.whatsappNumber === editing.phoneNumber) : true,
  )
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editing
      ? { fullName: editing.fullName, phoneNumber: editing.phoneNumber, whatsappNumber: editing.whatsappNumber, email: editing.email ?? '', nationalId: editing.nationalId ?? '', notes: editing.notes ?? '' }
      : {},
  })

  const submit = async (d: FormData) => {
    setBusy(true)
    try {
      const whatsappNumber = sameWhatsapp ? d.phoneNumber : (d.whatsappNumber || d.phoneNumber)
      if (editing) {
        await updateTenant(editing, { fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber, email: d.email, nationalId: d.nationalId, notes: d.notes }, actor)
        toast.success('Tenant updated')
      } else {
        const unit = vacantUnits.find(u => u.unitId === unitId)
        if (!unit) { toast.error('Select a vacant unit'); setBusy(false); return }
        await assignTenantToUnit({ propertyId, actor, unit, fullName: d.fullName, phoneNumber: d.phoneNumber, whatsappNumber, email: d.email, nationalId: d.nationalId, moveInDate: new Date(), notes: d.notes })
        toast.success('Tenant added')
      }
      onDone(); onClose(); form.reset(); setUnitId(''); setBlockId('')
    } catch (e) { console.error(e); toast.error('Save failed') } finally { setBusy(false) }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? 'Edit tenant' : 'Add tenant'}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
        {!editing && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Block *</label>
              <select className="input" value={blockId} onChange={e => { setBlockId(e.target.value); setUnitId('') }}>
                <option value="">Select block…</option>
                {blocks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Vacant unit *</label>
              <select className="input" value={unitId} onChange={e => setUnitId(e.target.value)} disabled={!blockId}>
                <option value="">{blockId ? 'Select unit…' : 'Select a block first'}</option>
                {blockUnits.map(u => <option key={u.unitId} value={u.unitId}>{u.unitNumber}</option>)}
              </select>
            </div>
          </div>
        )}
        <div><label className="label">Full name *</label><input className="input" {...form.register('fullName')} />{form.formState.errors.fullName && <p className="form-error">{form.formState.errors.fullName.message}</p>}</div>
        <div><label className="label">Phone *</label><input className="input" {...form.register('phoneNumber')} />{form.formState.errors.phoneNumber && <p className="form-error">{form.formState.errors.phoneNumber.message}</p>}</div>
        <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
          <input type="checkbox" checked={sameWhatsapp} onChange={e => setSameWhatsapp(e.target.checked)} className="rounded border-gray-300 text-lango-primary focus:ring-lango-primary/20" />
          WhatsApp number is the same as phone
        </label>
        {!sameWhatsapp && (
          <div><label className="label">WhatsApp number</label><input className="input" placeholder="e.g. 0712 345 678" {...form.register('whatsappNumber')} /></div>
        )}
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
