import { useMemo, useState } from 'react'
import { Users, Plus, Search, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { useShallow } from 'zustand/react/shallow'
import { useDemoStore, selectVacantUnits } from '../../store/demoStore'
import { TenantStatusBadge } from '../../../components/ui/StatusBadge'
import { Modal } from '../../../components/ui/Modal'
import type { DemoTenant } from '../../data/types'

function TenantForm({ editing, onClose }: { editing: DemoTenant | null; onClose: () => void }) {
  const addTenant = useDemoStore(s => s.addTenant)
  const updateTenant = useDemoStore(s => s.updateTenant)
  const vacant = useDemoStore(useShallow(selectVacantUnits))
  const [name, setName] = useState(editing?.name ?? '')
  const [phone, setPhone] = useState(editing?.phone ?? '')
  const [unitNumber, setUnitNumber] = useState(vacant[0]?.unitNumber ?? '')

  const submit = () => {
    if (name.trim().length < 2) { toast.error('Enter a name'); return }
    if (editing) { updateTenant(editing.id, { name, phone }); toast.success('Tenant updated') }
    else {
      if (!unitNumber) { toast.error('Pick a vacant unit'); return }
      addTenant({ name, phone, unitNumber }); toast.success('Tenant added')
    }
    onClose()
  }

  return (
    <Modal isOpen onClose={onClose} title={editing ? 'Edit tenant' : 'Add tenant'}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn-primary" onClick={submit}>{editing ? 'Save' : 'Add tenant'}</button>
      </>}>
      <div className="space-y-3">
        <div><label className="label">Full name</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Kamau" /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+2547…" /></div>
        {!editing && (
          <div><label className="label">Vacant unit</label>
            <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
              {vacant.length === 0 && <option value="">No vacant units</option>}
              {vacant.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default function DemoTenantsPage() {
  const tenants = useDemoStore(s => s.tenants)
  const [term, setTerm] = useState('')
  const [form, setForm] = useState<{ open: boolean; editing: DemoTenant | null }>({ open: false, editing: null })
  const [detail, setDetail] = useState<DemoTenant | null>(null)

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return tenants.filter(t => !q || t.name.toLowerCase().includes(q) || t.unitNumber.toLowerCase().includes(q) || t.phone.includes(q))
  }, [tenants, term])

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Tenants</h1><p className="text-sm text-gray-500">{tenants.length} tenants at Greenview Apartments.</p></div>
        </div>
        <button className="btn-primary" onClick={() => setForm({ open: true, editing: null })}><Plus className="w-4 h-4" /> Add Tenant</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name, unit or phone…" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      <div className="card divide-y divide-gray-50">
        {shown.map(t => (
          <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-4">
            <button className="min-w-0 text-left" onClick={() => setDetail(t)}>
              <div className="flex items-center gap-2"><span className="font-medium text-gray-900 truncate hover:text-lango-primary">{t.name}</span><TenantStatusBadge status="ACTIVE" /></div>
              <p className="text-xs text-gray-500 truncate">{t.unitNumber} · {t.phone}</p>
            </button>
            <button className="btn-secondary text-xs" onClick={() => setForm({ open: true, editing: t })}><Pencil className="w-3.5 h-3.5" /> Edit</button>
          </div>
        ))}
        {shown.length === 0 && <div className="px-4 py-10 text-center text-sm text-gray-500">No tenants match your search.</div>}
      </div>

      {form.open && <TenantForm key={form.editing?.id ?? 'new'} editing={form.editing} onClose={() => setForm({ open: false, editing: null })} />}
      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title={detail?.name ?? ''}>
        {detail && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Unit</span><span className="font-medium">{detail.unitNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{detail.phone}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-500">Status</span><TenantStatusBadge status="ACTIVE" /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
