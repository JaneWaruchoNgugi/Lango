interface Option<T extends string> { value: T; label: React.ReactNode }

/** A segmented control (Today / History, etc.) with one look across the app. */
export function Segmented<T extends string>({ value, onChange, options, className = '' }: {
  value: T; onChange: (v: T) => void; options: Option<T>[]; className?: string
}) {
  return (
    <div role="tablist" className={`inline-flex items-center gap-1 p-1 rounded-xl bg-gray-100/80 border border-gray-200/60 ${className}`}>
      {options.map(o => {
        const active = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              active ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/70' : 'text-gray-500 hover:text-gray-800'}`}>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A filter chip for horizontal filter rows. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-pressed={active}
      className={`shrink-0 inline-flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
        active ? 'bg-lango-dark text-white border-lango-dark' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-900'}`}>
      {children}
    </button>
  )
}
