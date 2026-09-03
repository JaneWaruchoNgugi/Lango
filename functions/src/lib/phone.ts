export function normalizeKenyanPhone(input: string): string | null {
  if (!input) return null
  const digits = input.replace(/[\s()\-]/g, '')
  let m = digits.match(/^0(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  m = digits.match(/^\+?254(7\d{8}|1\d{8})$/)
  if (m) return `+254${m[1]}`
  return null
}
