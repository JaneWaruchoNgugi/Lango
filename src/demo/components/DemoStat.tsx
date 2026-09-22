import type { LucideIcon } from 'lucide-react'

export function DemoStat({ icon: Icon, label, value, tint }: { icon: LucideIcon; label: string; value: number; tint: string }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tint}`}><Icon className="w-5 h-5" /></div>
      <div><p className="text-2xl font-bold text-gray-900">{value}</p><p className="text-sm text-gray-500">{label}</p></div>
    </div>
  )
}
