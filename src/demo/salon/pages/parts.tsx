import type { LucideIcon } from 'lucide-react'

export function Kpi({ icon: Icon, tone, label, value, sub }: { icon: LucideIcon; tone: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${tone}`}><Icon className="w-[18px] h-[18px]" /></span>
      </div>
      <p className="mt-3 font-display text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  )
}
