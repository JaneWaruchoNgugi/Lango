// ⚠️ REPLACE these placeholders with real Lango contact details before launch.
export const LANDING_CONTACT = {
  whatsappNumber: '254700000000', // international format, no '+'
  phone: '+254 700 000 000',
  email: 'hello@lango.co.ke',
}

export function waLink(message?: string): string {
  const base = `https://wa.me/${LANDING_CONTACT.whatsappNumber}`
  return message ? `${base}?text=${encodeURIComponent(message)}` : base
}

export const telLink = `tel:${LANDING_CONTACT.phone.replace(/\s/g, '')}`
export const mailtoLink = `mailto:${LANDING_CONTACT.email}`
