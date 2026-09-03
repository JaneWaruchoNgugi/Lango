/**
 * Generate sequential unit numbers for a block, e.g. ('A', 24) -> ['A01' ... 'A24'].
 * Padding widens automatically so numbers stay fixed-width (min 2 digits).
 */
export function generateUnitNumbers(prefix: string, count: number): string[] {
  if (!Number.isFinite(count) || count < 1) return []
  const clean = prefix.trim().toUpperCase()
  const width = Math.max(2, String(count).length)
  return Array.from({ length: count }, (_, i) =>
    `${clean}${String(i + 1).padStart(width, '0')}`,
  )
}
