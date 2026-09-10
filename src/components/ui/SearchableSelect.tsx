import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, Check, type LucideIcon } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  sublabel?: string
}

interface Props {
  value: string | null
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  disabled?: boolean
  icon?: LucideIcon
}

/**
 * A single-select dropdown with type-ahead filtering. Renders a button that
 * opens a searchable list; typing filters options by label or sublabel.
 */
export function SearchableSelect({
  value, options, onChange,
  placeholder = 'Select…', searchPlaceholder = 'Search…', emptyText = 'No matches',
  disabled, icon: Icon,
}: Props) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.value === value) ?? null

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase()
    if (!t) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(t) || (o.sublabel?.toLowerCase().includes(t) ?? false))
  }, [options, term])

  // Close on outside click; focus + clear the search each time it opens.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  useEffect(() => { if (open) { setTerm(''); inputRef.current?.focus() } }, [open])

  const choose = (v: string) => { onChange(v); setOpen(false) }

  return (
    <div className="relative" ref={ref}>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className={`input flex items-center gap-2 text-left ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {Icon && <Icon className="w-4 h-4 text-gray-400 shrink-0" />}
        <span className={`flex-1 truncate ${selected ? 'text-gray-900' : 'text-gray-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <div className="relative p-2 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input ref={inputRef} className="input pl-9" placeholder={searchPlaceholder}
              value={term} onChange={e => setTerm(e.target.value)} />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-gray-400">{emptyText}</p>
            ) : filtered.map(o => {
              const active = o.value === value
              return (
                <button type="button" key={o.value} onClick={() => choose(o.value)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 ${active ? 'bg-lango-primary/5' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{o.label}</p>
                    {o.sublabel && <p className="text-xs text-gray-500 truncate">{o.sublabel}</p>}
                  </div>
                  {active && <Check className="w-4 h-4 text-lango-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
