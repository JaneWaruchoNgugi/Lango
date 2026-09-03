/**
 * Normalise a Kenyan mobile number to E.164 (+254XXXXXXXXX).
 * Accepts 07../01.. local, 2547../2541.., and +2547../+2541.. forms.
 * Returns null when the input is not a valid Kenyan mobile number.
 */
export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[\s()\-]/g, '')
  // 07XXXXXXXX or 01XXXXXXXX  (10 digits, leading 0)
  let m = digits.match(/^0(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  // 2547XXXXXXXX / 2541XXXXXXXX with optional leading +
  m = digits.match(/^\+?254(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  return null
}

export function isValidKenyanPhone(input: string): boolean {
  return normalizeKenyanPhone(input) !== null
}
