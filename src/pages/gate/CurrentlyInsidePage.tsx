import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useCurrentVisitors } from '../../hooks/useCurrentVisitors'
import { checkOutVisitor } from '../../services/visitorService'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/Modal'
import { VisitTypeBadge } from '../../components/ui/StatusBadge'
import { formatDuration, durationMinutes } from '../../utils/format'
import { Users } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { Visitor } from '../../types'

export default function CurrentlyInsidePage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { visitors, loading } = useCurrentVisitors(user?.propertyId)
  const [confirm, setConfirm] = useState<Visitor | null>(null)
  const [busy, setBusy] = useState(false)

  const doCheckout = async (v: Visitor) => {
    setBusy(true)
    try { await checkOutVisitor(v, actor); toast.success(`${v.visitorName} checked out`) }
    catch { toast.error('Checkout failed') }
    finally { setBusy(false); setConfirm(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">Currently Inside ({visitors.length})</h1>
      {visitors.length === 0 ? <EmptyState icon={Users} title="No visitors inside" description="All clear." /> : (
        <div className="space-y-3">
          {visitors.map(v => (
            <div key={v.visitorId} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="font-medium text-gray-900">{v.visitorName}</p><VisitTypeBadge type={v.visitType} /></div>
                <p className="text-xs text-gray-500">{v.blockName} • {v.unitNumber} · in {format(v.checkInTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(v.checkInTime.toDate(), new Date()))}</p>
              </div>
              <button className="btn-secondary text-sm" onClick={() => setConfirm(v)}>Check Out</button>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog isOpen={!!confirm} onClose={() => setConfirm(null)} onConfirm={() => confirm && doCheckout(confirm)}
        title="Check Out Visitor" message={`Check out ${confirm?.visitorName}?`} confirmLabel="Check Out" loading={busy} />
    </div>
  )
}
