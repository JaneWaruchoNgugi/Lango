import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** Wrap in a card (for empty lists that stand alone on the page). */
  card?: boolean
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, card }: EmptyStateProps) {
  const body = (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-lango-primary/10 blur-xl" aria-hidden />
        <div className="relative w-16 h-16 rounded-2xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-center">
          <Icon className="w-7 h-7 text-lango-primary/70" strokeWidth={1.75} />
        </div>
      </div>
      <p className="text-[15px] font-semibold text-gray-900">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
  return card ? <div className="card">{body}</div> : body
}
