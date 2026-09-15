import { Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectShiftFor } from '../store/demoStore'

export function DemoShiftPanel({ staffId, staffName }: { staffId: string; staffName: string }) {
  const shift = useDemoStore(selectShiftFor(staffId))
  const startShift = useDemoStore(s => s.startShift)
  const endShift = useDemoStore(s => s.endShift)
  const on = shift?.status === 'ON'

  const start = () => { startShift(staffId); toast.success('Shift started') }
  const end = () => { endShift(staffId); toast('Shift ended') }

  return (
    <div className={`rounded-2xl p-5 flex items-center justify-between gap-4 ${on ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}><Clock className="w-5 h-5" /></div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{on ? 'On shift' : 'Off shift'}</p>
          <p className="text-xs text-gray-500 truncate">{staffName}{on && shift?.startedLabel ? ` · ${shift.startedLabel}` : ''}</p>
        </div>
      </div>
      {on
        ? <button className="btn-secondary shrink-0" onClick={end}>End Shift</button>
        : <button className="btn-primary shrink-0" onClick={start}>Start Shift</button>}
    </div>
  )
}
