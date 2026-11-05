import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SALON_SERVICE_LABELS, type SalonServiceType } from '../../../types'
import { useSalonDemo, fmtKes, type NewServiceInput } from '../store'
import { DEFAULT_PRICE } from '../data'

const TYPES = Object.keys(DEFAULT_PRICE) as SalonServiceType[]
const blank = (): NewServiceInput => ({ type: 'HAIR_DRESSING', style: '', providerId: '', price: DEFAULT_PRICE.HAIR_DRESSING ?? 0 })

export default function SalonDemoRegisterClient() {
  const navigate = useNavigate()
  const { providers, registerClient } = useSalonDemo()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [rows, setRows] = useState<NewServiceInput[]>([blank()])
  const active = providers.filter(p => p.active)

  const update = (i: number, patch: Partial<NewServiceInput>) => setRows(r => r.map((row, j) => j === i ? { ...row, ...patch } : row))
  const total = rows.reduce((n, r) => n + (Number(r.price) || 0), 0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Enter the client name')
    if (rows.some(r => !r.providerId)) return toast.error('Pick a provider for each service')
    registerClient({ name: name.trim(), phone: phone.trim() || '+254 7•• ••• •••', services: rows.map(r => ({ ...r, price: Number(r.price) || 0 })) })
    toast.success(`${name.trim()} is checked in`)
    navigate('/demo/salon/reception')
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader title="Register client" subtitle="Record the services and who's doing them." backTo="/demo/salon/reception" />
      <form onSubmit={submit} className="space-y-5">
        <div className="card p-5 sm:p-6">
          <h3 className="section-title">Client</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label" htmlFor="sd-name">Name</label><input id="sd-name" className="input" placeholder="e.g. Wanjiku Mbugua" value={name} onChange={e => setName(e.target.value)} /></div>
            <div><label className="label" htmlFor="sd-phone">Phone</label><input id="sd-phone" className="input" placeholder="07XX XXX XXX" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="section-title">Services</h3>
          <div className="space-y-3">
            {rows.map((r, i) => {
              const offering = [...active].sort((a, b) => Number(b.services.includes(r.type)) - Number(a.services.includes(r.type)))
              return (
                <div key={i} className="rounded-xl border border-gray-200 p-4 grid sm:grid-cols-2 gap-3 relative">
                  <div>
                    <label className="label" htmlFor={`sd-type-${i}`}>Service</label>
                    <select id={`sd-type-${i}`} className="input" value={r.type}
                      onChange={e => { const t = e.target.value as SalonServiceType; update(i, { type: t, price: DEFAULT_PRICE[t] ?? 0, providerId: '' }) }}>
                      {TYPES.map(t => <option key={t} value={t}>{SALON_SERVICE_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`sd-style-${i}`}>Style or notes</label>
                    <input id={`sd-style-${i}`} className="input" placeholder="e.g. Box braids, mid-back" value={r.style} onChange={e => update(i, { style: e.target.value })} />
                  </div>
                  <div>
                    <label className="label" htmlFor={`sd-prov-${i}`}>Provider</label>
                    <select id={`sd-prov-${i}`} className="input" value={r.providerId} onChange={e => update(i, { providerId: e.target.value })}>
                      <option value="">Choose a provider…</option>
                      {offering.map(p => <option key={p.id} value={p.id}>{p.name}{p.services.includes(r.type) ? '' : ' (other service)'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor={`sd-price-${i}`}>Price (KES)</label>
                    <input id={`sd-price-${i}`} className="input" type="number" min={0} step={50} value={r.price} onChange={e => update(i, { price: Number(e.target.value) })} />
                  </div>
                  {rows.length > 1 && (
                    <button type="button" onClick={() => setRows(rs => rs.filter((_, j) => j !== i))} aria-label="Remove service"
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <button type="button" className="btn-ghost text-sm mt-3" onClick={() => setRows(r => [...r, { ...blank(), type: 'MANICURE', price: DEFAULT_PRICE.MANICURE ?? 0 }])}>
            <Plus className="w-4 h-4" /> Add another service
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">Total <span className="ml-1 font-display text-xl font-bold text-gray-900">{fmtKes(total)}</span></p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={() => navigate('/demo/salon/reception')}>Cancel</button>
            <button type="submit" className="btn-primary">Register client</button>
          </div>
        </div>
      </form>
    </div>
  )
}
