import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface Props {
  title: React.ReactNode
  subtitle?: React.ReactNode
  /** Optional icon shown in a soft tile before the title. */
  icon?: LucideIcon
  /** Route to go back to; shows a back arrow before the title. */
  backTo?: string
  /** Buttons or links on the right. Wrap below the title on small screens. */
  actions?: React.ReactNode
  className?: string
}

/** The one page header every app screen uses, so titles, spacing and actions line up across roles. */
export function PageHeader({ title, subtitle, icon: Icon, backTo, actions, className = '' }: Props) {
  const navigate = useNavigate()
  return (
    <div className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {backTo && (
          <button onClick={() => navigate(backTo)} aria-label="Back"
            className="w-9 h-9 -ml-1 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {Icon && !backTo && (
          <div className="w-11 h-11 rounded-xl bg-white border border-gray-200/80 shadow-sm flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-lango-primary" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="page-title truncate">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}
