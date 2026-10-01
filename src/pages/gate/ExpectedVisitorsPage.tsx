import { useEffect, useState } from 'react'
import { getDocs, query, where } from 'firebase/firestore'
import { preApprovedCol } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { CalendarCheck, Search, CheckCircle, Clock, User } from 'lucide-react'
import { format } from 'date-fns'
import type { PreApprovedVisitor } from '../../types'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isInWindow(v: PreApprovedVisitor): boolean {
  const now = new Date()
  const dayMatch = v.accessDays.includes(now.getDay())
  if (!dayMatch) return false
  const [startH, startM] = v.accessStart.split(':').map(Number)
  const [endH,   endM]   = v.accessEnd.split(':').map(Number)
  const currentMins = now.getHours() * 60 + now.getMinutes()
  const startMins   = startH * 60 + startM
  const endMins     = endH   * 60 + endM
  return currentMins >= startMins && currentMins <= endMins
}

export default function ExpectedVisitorsPage() {
  const { user } = useAuth()
  const [allVisitors, setAllVisitors] = useState<PreApprovedVisitor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [arrived, setArrived] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.propertyId) { setLoading(false); return }
    const today = new Date().getDay()
    getDocs(query(preApprovedCol, where('propertyId', '==', user.propertyId), where('isActive', '==', true)))
      .then(snap => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id }))
        setAllVisitors(list.filter(v => v.accessDays.includes(today)))
      })
      .catch(e => console.error('[ExpectedVisitors]', e))
      .finally(() => setLoading(false))
  }, [user?.propertyId])

  const shown = allVisitors.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return v.name.toLowerCase().includes(q) || v.unitNumber.toLowerCase().includes(q)
  })

  const markArrived = (id: string) => setArrived(prev => { const s = new Set(prev); s.add(id); return s })

  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
          <CalendarCheck className="w-5 h-5 text-lango-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Expected Today</h1>
          <p className="text-sm text-gray-500">
            {DAY_LABELS[new Date().getDay()]}, {format(new Date(), 'dd MMM yyyy')} · {shown.length} expected
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name or unit…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <CalendarCheck className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No pre-approved visitors scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(v => {
            const inWindow = isInWindow(v)
            const isArrived = arrived.has(v.id)
            return (
              <div key={v.id} className={`card p-4 flex items-start gap-3 ${isArrived ? 'opacity-60' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-lango-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-lango-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{v.name}</p>
                    {inWindow && !isArrived && (
                      <span className="badge badge-green">Expected Now</span>
                    )}
                    {isArrived && (
                      <span className="badge badge-gray">Arrived</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Unit {v.unitNumber}{v.tenantName ? ` · ${v.tenantName}` : ''}
                    {v.relationship ? ` · ${v.relationship}` : ''}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-400">
                      {v.accessStart}–{v.accessEnd} · {v.accessDays.map(d => DAY_LABELS[d]).join(', ')}
                    </span>
                  </div>
                </div>
                {!isArrived && (
                  <button
                    onClick={() => markArrived(v.id)}
                    className="btn-secondary text-xs shrink-0 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Arrived
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
