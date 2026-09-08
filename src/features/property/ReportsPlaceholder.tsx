import { BarChart3 } from 'lucide-react'

export default function ReportsPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Reports</h1><p className="text-sm text-gray-500">Property analytics and exports.</p></div>
      </div>
      <div className="card p-10 text-center mt-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lango-light mb-4"><BarChart3 className="w-8 h-8 text-lango-primary" /></div>
        <h2 className="text-lg font-semibold text-gray-900">Reports are coming soon</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Daily/monthly visitor, delivery, incident, occupancy and guard-activity reports with PDF & Excel export are being built as a dedicated reporting module.</p>
      </div>
    </div>
  )
}
