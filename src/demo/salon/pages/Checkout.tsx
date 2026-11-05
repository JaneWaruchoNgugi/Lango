import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, CheckCircle2, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/ui/PageHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { Segmented } from '../../../components/ui/Segmented'
import { SALON_SERVICE_LABELS } from '../../../types'
import { useSalonDemo, fmtKes, initials } from '../store'

export default function SalonDemoCheckout() {
  const [params, setParams] = useSearchParams()
  const { clients, services, providers, checkouts, checkout } = useSalonDemo()
  const [q, setQ] = useState('')
  const [method, setMethod] = useState<'MPESA' | 'CASH'>('MPESA')
  const [code, setCode] = useState('')

  const active = clients.filter(c => c.status === 'ACTIVE' && (c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)))
  const selected = clients.find(c => c.id === params.get('client') && c.status === 'ACTIVE') ?? null
  const lines = selected ? services.filter(s => s.clientId === selected.id) : []
  const total = lines.reduce((n, s) => n + s.price, 0)
  const providerName = (id: string) => providers.find(p => p.id === id)?.name ?? '—'
  const select = (id: string | null) => { setParams(id ? { client: id } : {}); setCode('') }

  const confirm = () => {
    if (!selected) return
    if (method === 'MPESA' && !/^[A-Z0-9]{10}$/.test(code)) return toast.error('Enter the 10-character M-Pesa code')
    checkout(selected.id, { method, mpesaCode: method === 'MPESA' ? code : undefined })
    toast.success(`${selected.name} checked out · ${fmtKes(total)}`)
    select(null)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title="Checkout" subtitle="Pick a client, confirm payment and close their visit." className="!mb-0" />
      <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-start">
        <div className="card">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="input !pl-9" placeholder="Search name or phone" value={q} onChange={e => setQ(e.target.value)} aria-label="Search clients" />
            </div>
          </div>
          {active.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="No one to check out" description="Clients in the salon show here." />
          ) : (
            <ul className="divide-y divide-gray-100">
              {active.map(c => (
                <li key={c.id}>
                  <button onClick={() => select(c.id)} aria-pressed={selected?.id === c.id}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${selected?.id === c.id ? 'bg-lango-light/60' : 'hover:bg-gray-50'}`}>
                    <span className="w-9 h-9 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">{initials(c.name)}</span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-gray-900 truncate">{c.name}</span>
                      <span className="block text-xs text-gray-500">{c.phone} · {c.arrivedLabel}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5 sm:p-6">
          {!selected ? (
            <EmptyState icon={ShoppingBag} title="Select a client" description="Their services and total will show here." />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-gray-500">Checking out</p>
                <p className="font-display text-xl font-bold text-gray-900">{selected.name}</p>
              </div>
              <ul className="divide-y divide-gray-100 border-y border-gray-100">
                {lines.map(s => (
                  <li key={s.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{SALON_SERVICE_LABELS[s.type]}{s.style ? <span className="font-normal text-gray-500"> · {s.style}</span> : null}</p>
                      <p className="text-xs text-gray-500">{providerName(s.providerId)} · {s.done ? 'Done' : 'In progress'}</p>
                    </div>
                    <p className="text-sm font-semibold tabular-nums text-gray-900">{fmtKes(s.price)}</p>
                  </li>
                ))}
              </ul>
              <div className="flex items-baseline justify-between">
                <p className="text-sm text-gray-500">Total</p>
                <p className="font-display text-2xl font-bold text-gray-900">{fmtKes(total)}</p>
              </div>
              <div className="space-y-3">
                <Segmented<'MPESA' | 'CASH'> value={method} onChange={setMethod} options={[{ value: 'MPESA', label: 'M-Pesa' }, { value: 'CASH', label: 'Cash' }]} />
                {method === 'MPESA' && (
                  <div>
                    <label className="label" htmlFor="sd-mpesa">M-Pesa confirmation code</label>
                    <input id="sd-mpesa" className="input font-mono uppercase" placeholder="e.g. SKA41B7XQ2" maxLength={10}
                      value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} />
                  </div>
                )}
              </div>
              <button className="btn-primary w-full" onClick={confirm}><CheckCircle2 className="w-4 h-4" /> Confirm payment</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Today's checkouts</h3></div>
        <ul className="divide-y divide-gray-100">
          {checkouts.filter(k => k.day === 0).map(k => (
            <li key={k.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0"><p className="text-sm font-medium text-gray-900">{k.clientName}</p><p className="text-xs text-gray-500">{k.method === 'MPESA' ? `M-Pesa · ${k.mpesaCode}` : 'Cash'} · {k.timeLabel}</p></div>
              <p className="text-sm font-semibold tabular-nums">{fmtKes(k.total)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
