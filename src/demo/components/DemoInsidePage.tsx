import { DoorOpen } from 'lucide-react'
import { DemoCurrentlyInside } from './DemoCurrentlyInside'

export default function DemoInsidePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center"><DoorOpen className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Currently inside</h1><p className="text-sm text-gray-500">Everyone on the property right now. Check them out on exit.</p></div>
      </div>
      <DemoCurrentlyInside />
    </div>
  )
}
