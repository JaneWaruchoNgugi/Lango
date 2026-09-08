import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { checkOutVisitor } from '../../services/visitorService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { ConfirmDialog } from '../../components/ui/Modal'
import { VisitTypeBadge } from '../../components/ui/StatusBadge'
import { formatDuration, durationMinutes } from '../../utils/format'
import { Users, Search } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Visitor, VisitType } from '../../types'

const TYPE_TABS: { key: VisitType | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'FRIENDLY_VISIT', label: 'Personal' },
  { key: 'WORK', label: 'Work' },
  { key: 'DELIVERY', label: 'Delivery' },
  { key: 'SERVICE_PROVIDER', label: 'Service' },
]
const TONES = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500', 'bg-amber-500']
const toneFor = (k: string) => TONES[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]

export default function CurrentlyInsidePage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { visitors, loading } = useCurrentVisitors(user?.propertyId)
  const [confirm, setConfirm] = useState<Visitor | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<VisitType | 'ALL'>('ALL')
  const [term, setTerm] = useState('')

  const shown = useMemo(() => {
    const q = term.trim().toLowerCase()
    return visitors
      .filter(v => tab === 'ALL' || v.visitType === tab)
      .filter(v => !q || [v.visitorName, v.unitNumber, v.tenantName].some(x => x?.toLowerCase().includes(q)))
  }, [visitors, tab, term])

  const doCheckout = async (v: Visitor) => {
    setBusy(true)
    try { await checkOutVisitor(v, actor); toast.success(`${v.visitorName} checked out`) }
    catch { toast.error('Checkout failed') } finally { setBusy(false); setConfirm(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Currently Inside</h1><p className="text-sm text-gray-500">{visitors.length} visitor{visitors.length === 1 ? '' : 's'} on site.</p></div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search visitor…" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {TYPE_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${tab === t.key ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5"><Users className="w-12 h-12 text-lango-primary/40" /></div>
          <h3 className="font-bold text-gray-900">No visitors inside</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{visitors.length === 0 ? 'All clear — no one is currently on site.' : 'No visitors match your search or filter.'}</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {shown.map(v => (
            <div key={v.visitorId} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${toneFor(v.visitorId || v.visitorName)}`}>{v.visitorName?.[0]?.toUpperCase() ?? '?'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2"><p className="font-medium text-gray-900 truncate">{v.visitorName}</p><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500 truncate">{v.unitNumber} · in {format(v.checkInTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(v.checkInTime.toDate(), new Date()))}</p>
              </div>
              <button className="btn-secondary text-xs shrink-0" onClick={() => setConfirm(v)}>Check Out</button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && doCheckout(confirm)}
        title="Check Out Visitor" message={`Check out ${confirm?.visitorName}?`} confirmLabel="Check Out" loading={busy} />
    </div>
  )
}
