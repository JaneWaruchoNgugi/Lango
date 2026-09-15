import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectPendingApprovals } from '../store/demoStore'

export function DemoPendingApprovals({ unitNumber }: { unitNumber?: string }) {
  const all = useDemoStore(selectPendingApprovals)
  const approvals = unitNumber ? all.filter(a => a.unitNumber === unitNumber) : all
  const approveVisitor = useDemoStore(s => s.approveVisitor)
  const declineVisitor = useDemoStore(s => s.declineVisitor)
  const approve = (id: string, name: string) => { approveVisitor(id); toast.success(`${name} approved`) }
  const decline = (id: string, name: string) => { declineVisitor(id); toast(`${name} declined`) }

  if (approvals.length === 0) {
    return <div className="card px-4 py-8 text-center text-sm text-gray-500">No pending approvals.</div>
  }
  return (
    <div className="space-y-2">
      {approvals.map(a => (
        <div key={a.id} className="card p-4 flex items-center justify-between gap-4">
          <div className="min-w-0"><p className="font-medium text-gray-900 truncate">{a.visitorName}</p><p className="text-xs text-gray-500 truncate">{a.unitNumber} · {a.purpose}</p></div>
          <div className="flex gap-2 shrink-0">
            <button className="btn-primary text-xs" onClick={() => approve(a.id, a.visitorName)}><Check className="w-3.5 h-3.5" /> Approve</button>
            <button className="btn-secondary text-xs" onClick={() => decline(a.id, a.visitorName)}><X className="w-3.5 h-3.5" /> Decline</button>
          </div>
        </div>
      ))}
    </div>
  )
}
