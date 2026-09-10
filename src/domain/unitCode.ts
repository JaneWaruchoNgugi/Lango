export const MAX_UNIT_CODE_LENGTH = 20

/**
 * Validate a unit code against existing codes in the same property.
 * Returns an error message, or null when valid. Codes are strings, never
 * validated as numbers. Uniqueness is case-insensitive and trims whitespace.
 */
export function validateUnitCode(code: string, existingCodes: string[]): string | null {
  const trimmed = code.trim()
  if (!trimmed) return 'Unit code is required'
  if (trimmed.length > MAX_UNIT_CODE_LENGTH) {
    return `Unit code must be at most ${MAX_UNIT_CODE_LENGTH} characters`
  }
  const norm = trimmed.toLowerCase()
  if (existingCodes.some((c) => c.trim().toLowerCase() === norm)) {
    return 'That unit code already exists in this property'
  }
  return null
}
