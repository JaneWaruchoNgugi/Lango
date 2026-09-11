import { Timestamp } from 'firebase/firestore'

type DateLike = Timestamp | Date

export function durationMinutes(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000)
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m`
}

function toDate(v: DateLike): Date {
  return v instanceof Date ? v : v.toDate()
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** yyyy-mm-dd (local) for <input type="date">. */
export function tsToInputDate(v: DateLike): string {
  const d = toDate(v)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Parse a yyyy-mm-dd string to a local-midnight Date. */
export function inputDateToDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** e.g. "Jan 2025". */
export function formatMonthYear(v: DateLike): string {
  const d = toDate(v)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "12 Jan 2025". */
export function formatDateLong(v: DateLike): string {
  const d = toDate(v)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Human tenancy length. `to` defaults to now (still-active tenancy). */
export function tenancyLength(from: DateLike, to?: DateLike | null): string {
  const start = toDate(from)
  const end = to ? toDate(to) : new Date()
  const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000))
  if (days < 30) return days <= 1 ? '1 day' : `${days} days`
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  if (end.getDate() < start.getDate()) months -= 1
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${rem} mo`
  return rem === 0 ? `${years} yr` : `${years} yr ${rem} mo`
}
