import { useMemo, useState } from 'react'
import { subDays, startOfWeek } from 'date-fns'
import { useAuth } from '../../contexts/AuthContext'
import { useVisitorsInRange } from '../../hooks/useVisitorsInRange'
import { checkOutVisitor } from '../../services/visitorService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { ConfirmDialog } from '../../components/ui/Modal'
import { VisitTypeBadge, VisitorStatusBadge } from '../../components/ui/StatusBadge'
import { formatDuration, durationMinutes } from '../../utils/format'
import { Users, Search, History } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Visitor, VisitType } from '../../types'

type MainTab   = 'today' | 'history'
type HistRange = 'yesterday' | 'week'

const TYPE_TABS: { key: VisitType | 'ALL'; label: string }[] = [
  { key: 'ALL',              label: 'All'      },
  { key: 'FRIENDLY_VISIT',   label: 'Personal' },
  { key: 'WORK',             label: 'Work'     },
  { key: 'DELIVERY',         label: 'Delivery' },
  { key: 'SERVICE_PROVIDER', label: 'Service'  },
]

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,  0,  0,   0); return x }
const endOfDay   = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }

const TONES = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-sky-500','bg-pink-500','bg-teal-500','bg-amber-500']
const toneFor = (k: string) => TONES[[...k].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]

export default function CurrentlyInsidePage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }

  const [mainTab,  setMainTab]  = useState<MainTab>('today')
  const [histRange, setHistRange] = useState<HistRange>('yesterday')
  const [typeTab,  setTypeTab]  = useState<VisitType | 'ALL'>('ALL')
  const [term,     setTerm]     = useState('')
  const [confirm,  setConfirm]  = useState<Visitor | null>(null)
  const [busy,     setBusy]     = useState(false)

  const now = useMemo(() => new Date(), [])

  const todayFrom = useMemo(() => startOfDay(now), [now])
  const todayTo   = useMemo(() => endOfDay(now),   [now])

  const histFrom = useMemo(() => {
    if (histRange === 'yesterday') return startOfDay(subDays(now, 1))
    return startOfWeek(now, { weekStartsOn: 1 })
  }, [histRange, now])
  const histTo = useMemo(() => {
    if (histRange === 'yesterday') return endOfDay(subDays(now, 1))
    return endOfDay(now)
  }, [histRange, now])

  const { visitors: todayVisitors, loading: todayLoading } =
    useVisitorsInRange(user?.propertyId, todayFrom, todayTo)
  const { visitors: histVisitors, loading: histLoading } =
    useVisitorsInRange(user?.propertyId, histFrom, histTo)

  const activeVisitors = useMemo(() => todayVisitors.filter(v => v.status === 'INSIDE'), [todayVisitors])

  const shown = useMemo(() => {
    const pool = mainTab === 'today' ? todayVisitors : histVisitors
    const q    = term.trim().toLowerCase()
    return pool
      .filter(v => typeTab === 'ALL' || v.visitType === typeTab)
      .filter(v => !q || [v.visitorName, v.unitNumber, v.tenantName].some(x => x?.toLowerCase().includes(q)))
  }, [mainTab, todayVisitors, histVisitors, typeTab, term])

  const doCheckout = async (v: Visitor) => {
    setBusy(true)
    try { await checkOutVisitor(v, actor); toast.success(`${v.visitorName} checked out`) }
    catch { toast.error('Checkout failed') } finally { setBusy(false); setConfirm(null) }
  }

  if (mainTab === 'today' && todayLoading) return <PageLoader />
  if (mainTab === 'history' && histLoading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {mainTab === 'today' ? "Today's Visitors" : 'History'}
          </h1>
          <p className="text-sm text-gray-500">
            {mainTab === 'today'
              ? `${activeVisitors.length} currently inside · ${todayVisitors.length} total today`
              : `${shown.length} visitor${shown.length === 1 ? '' : 's'} found`}
          </p>
        </div>
      </div>

      {/* Main tab switcher */}
      <div className="flex gap-2 border-b border-gray-100 pb-1">
        <button onClick={() => setMainTab('today')}
          className={`text-sm font-semibold px-1 pb-2 border-b-2 transition-colors ${mainTab === 'today' ? 'border-lango-primary text-lango-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          Today
        </button>
        <button onClick={() => setMainTab('history')}
          className={`flex items-center gap-1.5 text-sm font-semibold px-1 pb-2 border-b-2 transition-colors ${mainTab === 'history' ? 'border-lango-primary text-lango-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
          <History className="w-3.5 h-3.5" /> History
        </button>
      </div>

      {/* History range pills */}
      {mainTab === 'history' && (
        <div className="flex gap-2">
          {(['yesterday', 'week'] as HistRange[]).map(r => (
            <button key={r} onClick={() => setHistRange(r)}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${histRange === r ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {r === 'yesterday' ? 'Yesterday' : 'This Week'}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search visitor…" value={term} onChange={e => setTerm(e.target.value)} />
      </div>

      {/* Type filter chips */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {TYPE_TABS.map(t => (
          <button key={t.key} onClick={() => setTypeTab(t.key)}
            className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${typeTab === t.key ? 'bg-lango-primary text-white border-lango-primary' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Visitor list */}
      {shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5">
            <Users className="w-12 h-12 text-lango-primary/40" />
          </div>
          <h3 className="font-bold text-gray-900">No visitors</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">
            {mainTab === 'today'
              ? (todayVisitors.length === 0 ? 'No visitors have checked in today.' : 'No visitors match your search or filter.')
              : 'No visitors found for this period.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {shown.map(v => (
            <div key={v.visitorId} className="flex items-center gap-3 px-4 py-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${toneFor(v.visitorId || v.visitorName)}`}>
                {v.visitorName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">{v.visitorName}</p>
                  <VisitTypeBadge type={v.visitType} />
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {v.unitNumber} · in {format(v.checkInTime.toDate(), 'h:mm a')}
                  {v.status === 'INSIDE'
                    ? ` · ${formatDuration(durationMinutes(v.checkInTime.toDate(), new Date()))}`
                    : v.checkOutTime
                      ? ` · out ${format(v.checkOutTime.toDate(), 'h:mm a')}`
                      : ''}
                </p>
                {(v.gatePassNumber || v.itemsBroughtIn) && (
                  <p className="text-xs text-gray-400 truncate">
                    {v.gatePassNumber ? `Pass ${v.gatePassNumber}` : ''}
                    {v.gatePassNumber && v.itemsBroughtIn ? ' · ' : ''}
                    {v.itemsBroughtIn ? `Items: ${v.itemsBroughtIn}` : ''}
                  </p>
                )}
              </div>
              {v.status === 'INSIDE' ? (
                <button className="btn-secondary text-xs shrink-0" onClick={() => setConfirm(v)}>Check Out</button>
              ) : (
                <VisitorStatusBadge status={v.status} />
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => confirm && doCheckout(confirm)}
        title="Check Out Visitor" message={`Check out ${confirm?.visitorName}?`}
        confirmLabel="Check Out" loading={busy}
      />
    </div>
  )
}
