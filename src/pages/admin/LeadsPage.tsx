import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, orderBy, limit, updateDoc } from 'firebase/firestore'
import { leadsCol, leadDoc } from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Inbox } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Lead, LeadStatus } from '../../types'

const statusBadge: Record<LeadStatus, string> = { NEW: 'badge-blue', CONTACTED: 'badge-yellow', CLOSED: 'badge-gray' }

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | LeadStatus>('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(leadsCol, orderBy('createdAt', 'desc'), limit(200)))
        setLeads(snap.docs.map(d => ({ ...d.data(), leadId: d.id })))
      } catch (err) {
        console.error('Leads load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const shown = useMemo(() => filter === 'ALL' ? leads : leads.filter(l => l.status === filter), [leads, filter])

  const setStatus = async (lead: Lead, status: LeadStatus) => {
    try {
      await updateDoc(leadDoc(lead.leadId), { status })
      setLeads(prev => prev.map(l => l.leadId === lead.leadId ? { ...l, status } : l))
    } catch (err) {
      console.error(err); toast.error('Could not update lead')
    }
  }

  if (loading) return <PageLoader />
  const filters: ('ALL' | LeadStatus)[] = ['ALL', 'NEW', 'CONTACTED', 'CLOSED']

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">Demo requests from the landing page.</p>
        </div>
        <div className="flex gap-1">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg border ${filter === f ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>
              {f === 'ALL' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50"><h3 className="section-title mb-0">Requests ({shown.length})</h3></div>
        {shown.length === 0 ? (
          <EmptyState icon={Inbox} title="No leads yet" description="Demo requests from the landing page will appear here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {shown.map(l => (
              <div key={l.leadId} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900">{l.name}</p>
                    <span className={`badge ${statusBadge[l.status]}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{l.propertyName} · {l.propertyType} · {l.phone}{l.email ? ` · ${l.email}` : ''}</p>
                  {l.message && <p className="text-xs text-gray-400 mt-1">{l.message}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{l.createdAt ? format(l.createdAt.toDate(), 'dd MMM yyyy, h:mm a') : ''}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  {l.status !== 'CONTACTED' && <button onClick={() => setStatus(l, 'CONTACTED')} className="btn-secondary text-xs">Mark contacted</button>}
                  {l.status !== 'CLOSED' && <button onClick={() => setStatus(l, 'CLOSED')} className="btn-ghost text-xs">Close</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
