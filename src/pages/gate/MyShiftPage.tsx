import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { startShift, endShift } from '../../services/shiftService'
import { LogIn, LogOut, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { formatDuration, durationMinutes } from '../../utils/format'
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function MyShiftPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { shift } = useShift(user?.uid)
  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)
    try {
      if (shift) { await endShift(shift, actor); toast.success('Shift ended') }
      else { await startShift(user!.propertyId!, actor); toast.success('Shift started') }
    } catch { toast.error('Action failed') } finally { setBusy(false) }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Clock className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">My Shift</h1><p className="text-sm text-gray-500">Your current shift and activity.</p></div>
      </div>
      <div className={`card p-4 flex items-center gap-3 ${shift ? 'bg-green-50 border-green-100' : ''}`}>
        <span className={`w-2.5 h-2.5 rounded-full ${shift ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
        <div>
          <p className="text-sm font-semibold text-gray-900">{shift ? 'On Shift' : 'Not on Shift'}</p>
          {shift && <p className="text-xs text-gray-500">Started {format(shift.startTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(shift.startTime.toDate(), new Date()))}</p>}
        </div>
      </div>
      {shift && (
        <div className="grid grid-cols-3 gap-3">
          {[['Visitors', shift.visitorsRegistered], ['Deliveries', shift.deliveriesRegistered], ['Incidents', shift.incidentsReported]].map(([l, v]) => (
            <div key={l as string} className="card p-4 text-center"><p className="text-2xl font-bold text-gray-900">{v as number}</p><p className="text-xs text-gray-500">{l}</p></div>
          ))}
        </div>
      )}
      <button onClick={toggle} disabled={busy} className={`${shift ? 'btn-secondary' : 'btn-primary'} w-full py-3`}>
        {shift ? <><LogOut className="w-4 h-4" /> End Shift</> : <><LogIn className="w-4 h-4" /> Start Shift</>}
      </button>
    </div>
  )
}
