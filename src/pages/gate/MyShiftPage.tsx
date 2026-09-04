import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { startShift, endShift } from '../../services/shiftService'
import { LogIn, LogOut } from 'lucide-react'
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
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <h1 className="page-title">My Shift</h1>
      <div className={`card p-5 ${shift ? 'border-l-4 border-l-green-500' : ''}`}>
        <p className="text-sm font-semibold text-gray-900">{shift ? 'On Shift' : 'Not on Shift'}</p>
        {shift && <p className="text-xs text-gray-500">Started {format(shift.startTime.toDate(), 'h:mm a')} · {formatDuration(durationMinutes(shift.startTime.toDate(), new Date()))}</p>}
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
