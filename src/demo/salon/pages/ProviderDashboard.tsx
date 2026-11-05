import { CheckCircle2, Clock, Scissors } from 'lucide-react'
import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/ui/PageHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { SALON_SERVICE_LABELS } from '../../../types'
import { useSalonDemo, initials } from '../store'
import { DEMO_PROVIDER_ID } from '../data'

export default function SalonDemoProviderDashboard() {
  const { providers, services, clients, completeService } = useSalonDemo()
  const me = providers.find(p => p.id === DEMO_PROVIDER_ID)!
  const mine = services.filter(s => s.providerId === me.id)
  const queue = mine.filter(s => !s.done)
  const done = mine.filter(s => s.done)
  const client = (id: string) => clients.find(c => c.id === id)

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <PageHeader title={`Hi, ${me.name.split(' ')[0]}`} subtitle={`${me.code} · ${me.services.map(s => SALON_SERVICE_LABELS[s]).join(', ')}`} className="!mb-0" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-lango-dark text-white p-5 shadow-card">
          <p className="text-sm text-white/70 flex items-center gap-2"><Clock className="w-4 h-4" /> Waiting on you</p>
          <p className="mt-2 font-display text-3xl font-bold">{queue.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Done today</p>
          <p className="mt-2 font-display text-3xl font-bold text-gray-900">{done.length}</p>
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Your clients now</h3></div>
        {queue.length === 0 ? (
          <EmptyState icon={Scissors} title="All caught up" description="New clients assigned to you at reception appear here." />
        ) : (
          <ul className="divide-y divide-gray-100">
            {queue.map(s => {
              const c = client(s.clientId)
              return (
                <li key={s.id} className="px-5 py-4 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">{initials(c?.name ?? '?')}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{SALON_SERVICE_LABELS[s.type]}{s.style ? ` · ${s.style}` : ''} · arrived {c?.arrivedLabel}</p>
                  </div>
                  <button className="btn-primary text-xs shrink-0" onClick={() => { completeService(s.id); toast.success('Marked as done') }}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Done
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {done.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Finished today</h3></div>
          <ul className="divide-y divide-gray-100">
            {done.map(s => (
              <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-sm text-gray-900 truncate">{client(s.clientId)?.name} <span className="text-gray-500">· {SALON_SERVICE_LABELS[s.type]}</span></p>
                <span className="badge badge-green">Done</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400 text-center">Providers never see prices or payments, only their own clients.</p>
    </div>
  )
}
