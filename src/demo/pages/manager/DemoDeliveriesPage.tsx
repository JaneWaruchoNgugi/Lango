import { useState } from 'react'
import { Package, PackagePlus, Sparkles, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore } from '../../store/demoStore'
import { DemoDeliveryBadge } from '../../components/DemoBadges'
import { Modal } from '../../../components/ui/Modal'

const SAMPLE = { company: 'Glovo', unitNumber: 'A-101' }

function RegisterDeliveryForm({ onClose }: { onClose: () => void }) {
  const registerDelivery = useDemoStore(s => s.registerDelivery)
  const units = useDemoStore(s => s.units)
  const [company, setCompany] = useState('')
  const [unitNumber, setUnitNumber] = useState(units[0]?.unitNumber ?? '')
  const submit = () => {
    if (company.trim().length < 2) { toast.error('Enter a company'); return }
    registerDelivery({ company, unitNumber }); toast.success('Delivery registered'); onClose()
  }
  return (
    <Modal isOpen onClose={onClose} title="Register a delivery"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={submit}>Register</button></>}>
      <div className="space-y-3">
        <div><label className="label">Company / courier</label><input className="input" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. DHL" /></div>
        <div><label className="label">Destination unit</label>
          <select className="input" value={unitNumber} onChange={e => setUnitNumber(e.target.value)}>
            {units.map(u => <option key={u.id} value={u.unitNumber}>{u.unitNumber}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}

export default function DemoDeliveriesPage() {
  const deliveries = useDemoStore(s => s.deliveries)
  const registerDelivery = useDemoStore(s => s.registerDelivery)
  const checkInDelivery = useDemoStore(s => s.checkInDelivery)
  const collectDelivery = useDemoStore(s => s.collectDelivery)
  const [formOpen, setFormOpen] = useState(false)

  const registerSample = () => { registerDelivery(SAMPLE); toast.success(`${SAMPLE.company} delivery registered`) }
  const checkIn = (id: string, company: string) => { checkInDelivery(id); toast.success(`${company} checked in`) }
  const collect = (id: string, company: string) => { collectDelivery(id); toast.success(`${company} collected`) }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><Package className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Deliveries</h1><p className="text-sm text-gray-500">Log parcels at the gate and hand them off cleanly.</p></div>
      </div>

      <div className="rounded-2xl bg-lango-dark text-white p-5">
        <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide"><Sparkles className="w-3.5 h-3.5" /> See how parcel handling works</div>
        <p className="mt-2 text-sm text-white/70 max-w-xl">A courier arrives with a parcel. Check it in at the gate, then mark it collected when the resident picks it up — each step lands on your dashboard activity.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={registerSample}><PackagePlus className="w-4 h-4" /> Register the sample delivery</button>
          <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20" onClick={() => setFormOpen(true)}>Register your own</button>
        </div>
      </div>

      <div>
        <h2 className="section-title">Today's deliveries</h2>
        {deliveries.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-gray-500">No deliveries logged.</div>
        ) : (
          <div className="space-y-2">
            {deliveries.map(d => (
              <div key={d.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{d.company}</p>
                  <p className="text-xs text-gray-500 truncate">{d.unitNumber} · {d.expectedLabel}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <DemoDeliveryBadge status={d.status} />
                  {d.status === 'EXPECTED' && <button className="btn-primary text-xs" onClick={() => checkIn(d.id, d.company)}>Check In</button>}
                  {d.status === 'RECEIVED' && <button className="btn-primary text-xs" onClick={() => collect(d.id, d.company)}><Check className="w-3.5 h-3.5" /> Mark Collected</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && <RegisterDeliveryForm onClose={() => setFormOpen(false)} />}
    </div>
  )
}
