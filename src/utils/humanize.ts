/** Turn an enum value like `SUSPICIOUS_VISITOR` into `Suspicious visitor` for display. */
export function humanize(value: string | null | undefined): string {
  if (!value) return ''
  const s = value.replace(/_/g, ' ').toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
