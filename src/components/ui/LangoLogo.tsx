import { useId } from 'react'

interface Props {
  /** Size of the square mark in px. */
  size?: number
  /** Show the "Lango" wordmark next to the mark. */
  wordmark?: boolean
  /** `light` for dark backgrounds (sidebar, footer), `dark` for light backgrounds. */
  tone?: 'light' | 'dark'
  /** Small caption under the wordmark, e.g. the user's role. */
  caption?: string
  className?: string
}

/**
 * The Lango brand mark: a gate arch with an "L" stroke and an amber key dot.
 * One component so the sidebar, mobile bar, login and landing page all match.
 */
export function LangoLogo({ size = 32, wordmark = true, tone = 'dark', caption, className = '' }: Props) {
  // Unique gradient id per instance: a shared id breaks when the first copy sits in a hidden sidebar.
  const gid = `lango-mark-${useId().replace(/:/g, '')}`
  const text = tone === 'light' ? 'text-white' : 'text-lango-dark'
  const sub = tone === 'light' ? 'text-white/55' : 'text-gray-500'
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill={`url(#${gid})`} />
        <path d="M9 24V13a7 7 0 0 1 14 0" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M12.5 11v11.5H22" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="22.5" cy="16.5" r="2" fill="#f59e0b" />
      </svg>
      {wordmark && (
        <span className="leading-tight">
          <span className={`block font-display font-bold tracking-tight text-[17px] ${text}`}>Lango</span>
          {caption && <span className={`block text-xs ${sub}`}>{caption}</span>}
        </span>
      )}
    </span>
  )
}
