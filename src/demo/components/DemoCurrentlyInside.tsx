import { DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDemoStore, selectInsideVisitors } from '../store/demoStore'

export function DemoCurrentlyInside() {
  const inside = useDemoStore(selectInsideVisitors)
  const checkOut = useDemoStore(s => s.checkOutVisitor)
  const doCheckout = (id: string, name: string) => { checkOut(id); toast.success(`${name} checked out`) }

  return (
    <div className="card divide-y divide-gray-50">
      {inside.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-500">No one is currently inside.</div>}
      {inside.map(v => (
        <div key={v.id} className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0"><DoorOpen className="w-4 h-4" /></div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{v.name}</p>
              <p className="text-xs text-gray-500 truncate">{v.unitNumber} · {v.type.replace(/_/g, ' ').toLowerCase()}{v.checkInLabel ? ` · ${v.checkInLabel}` : ''}</p>
            </div>
          </div>
          <button className="btn-secondary text-xs" onClick={() => doCheckout(v.id, v.name)}>Check Out</button>
        </div>
      ))}
    </div>
  )
}
