import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { endShift } from '../../services/shiftService'
import { LogOut } from 'lucide-react'
import { format } from 'date-fns'
import { Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import toast from 'react-hot-toast'
import { SHIFT_CONFIG } from '../../types'

function formatTimer(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0')
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

export default function MyShiftPage() {
  const { user } = useAuth()
  const { shift, loading } = useShift(user?.uid, user?.propertyId)

  const [elapsed, setElapsed] = useState(0)
  const [showEndModal, setShowEndModal] = useState(false)
  const [handoverNote, setHandoverNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!shift || !shift.startTime) { setElapsed(0); return }
    const startMs = shift.startTime.toDate().getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - startMs) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [shift])

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
  if (!shift) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>

  const guardName = user?.profile?.name ?? 'Guard'
  const shiftLabel = SHIFT_CONFIG[shift.shiftType ?? 'DAY']?.label ?? 'Day Shift'
  const actor = { uid: user?.uid ?? '', name: guardName, role: 'SECURITY_GUARD' as const }

  const handleEndShift = async () => {
    setBusy(true)
    try {
      await endShift(shift, actor, handoverNote)
      toast.success('Shift ended')
      setShowEndModal(false)
      await signOut(auth)
    } catch (e) {
      toast.error((e as Error).message ?? 'Could not end shift')
      setBusy(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      {/* Active shift card */}
      <div className="card p-5 bg-green-50 border-green-200 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-green-700">SHIFT ACTIVE</span>
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{guardName}</p>
          <p className="text-sm text-gray-600">{shiftLabel} · {shift.securityPost || 'No post assigned'}</p>
          {shift.startTime && (
            <p className="text-xs text-gray-500 mt-1">
              Started {format(shift.startTime.toDate(), 'h:mm a')}
            </p>
          )}
        </div>
        <div className="text-center py-2">
          <p className="text-4xl font-mono font-bold text-gray-900 tracking-wider">{formatTimer(elapsed)}</p>
          <p className="text-xs text-gray-500 mt-1">Duration</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ['Visitors', shift.visitorsRegistered],
          ['Deliveries', shift.deliveriesRegistered],
          ['Incidents', shift.incidentsReported],
        ] as [string, number][]).map(([l, v]) => (
          <div key={l} className="card p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{v}</p>
            <p className="text-xs text-gray-500">{l}</p>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowEndModal(true)}
        className="btn-secondary w-full py-3 text-base border-red-200 text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-4 h-4" /> End Shift
      </button>

      {/* End shift modal — confirm + optional handover note */}
      <Modal
        isOpen={showEndModal}
        onClose={() => !busy && setShowEndModal(false)}
        title="End Shift"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setShowEndModal(false)}
              className="btn-secondary"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              onClick={handleEndShift}
              className="btn-danger"
              disabled={busy}
            >
              {busy ? <Spinner size="sm" className="text-white" /> : 'End Shift & Log Out'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-900">{guardName}</p>
            <p className="text-gray-600">{shiftLabel} · {shift.securityPost || 'No post'}</p>
            <p className="text-gray-500">
              {shift.startTime ? `Started ${format(shift.startTime.toDate(), 'h:mm a')} · ` : ''}{formatTimer(elapsed)}
            </p>
          </div>
          <div>
            <label className="label">Handover Note <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              className="input min-h-[90px] resize-none"
              placeholder="Anything the next guard should know…"
              value={handoverNote}
              onChange={e => setHandoverNote(e.target.value)}
            />
          </div>
          <p className="text-xs text-gray-400">
            You will be logged out after ending the shift.
          </p>
        </div>
      </Modal>
    </div>
  )
}
