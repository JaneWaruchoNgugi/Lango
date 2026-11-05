import toast from 'react-hot-toast'
import { PageHeader } from '../../../components/ui/PageHeader'
import { SALON_SERVICE_LABELS } from '../../../types'
import { useSalonDemo, initials } from '../store'

export default function SalonDemoOwnerProviders() {
  const { providers, services, salon, toggleProvider } = useSalonDemo()
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader title="Service providers" subtitle={salon.name} className="!mb-0"
        actions={<button className="btn-primary" onClick={() => toast('Adding providers is turned off in the demo')}>Add provider</button>} />
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100"><h3 className="section-title mb-0">Providers ({providers.length})</h3></div>
        <ul className="divide-y divide-gray-100">
          {providers.map(p => {
            const today = services.filter(s => s.providerId === p.id).length
            return (
              <li key={p.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">{initials(p.name)}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <span className="badge badge-gray font-mono">{p.code}</span>
                      <span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.phone} · {today} {today === 1 ? 'service' : 'services'} today</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.services.map(s => <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{SALON_SERVICE_LABELS[s]}</span>)}
                    </div>
                  </div>
                </div>
                <button className="btn-secondary text-xs self-start sm:self-center ml-[52px] sm:ml-0" onClick={() => toggleProvider(p.id)}>
                  {p.active ? 'Deactivate' : 'Activate'}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
