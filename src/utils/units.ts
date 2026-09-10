export interface UnitCodeConfig {
  /** Optional prefix, kept verbatim (no forced case). '' = no prefix. */
  prefix?: string
  /** First number in the sequence. Default 1. */
  start?: number
  /** How many codes to produce. */
  count: number
  /** Leading-zero width for the numeric part. 0 = natural width. Default 0. */
  padding?: number
}

/**
 * Generate a list of string unit codes from a numbering config.
 * Codes are strings — never treated as integers by the rest of the app.
 */
export function generateUnitCodes({
  prefix = '',
  start = 1,
  count,
  padding = 0,
}: UnitCodeConfig): string[] {
  if (!Number.isFinite(count) || count < 1) return []
  const from = Number.isFinite(start) ? start : 1
  return Array.from({ length: count }, (_, i) => {
    const n = from + i
    const num = padding > 0 ? String(n).padStart(padding, '0') : String(n)
    return `${prefix}${num}`
  })
}

/**
 * Legacy helper kept for existing callers: uppercased prefix, min-2 padding,
 * starting at 1. Implemented on top of generateUnitCodes.
 */
export function generateUnitNumbers(prefix: string, count: number): string[] {
  const clean = prefix.trim().toUpperCase()
  const padding = Math.max(2, String(Math.max(count, 1)).length)
  return generateUnitCodes({ prefix: clean, start: 1, count, padding })
}
