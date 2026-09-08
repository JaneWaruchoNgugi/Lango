import { z } from 'zod'
import { normalizeKenyanPhone } from '../../utils/phone'

export const leadFormSchema = z.object({
  name:         z.string().trim().min(1, 'Your name is required').max(120),
  propertyName: z.string().trim().max(120).optional(),
  propertyType: z.string().trim().min(1, 'Select a property type'),
  phone:        z.string().trim().refine(v => normalizeKenyanPhone(v) !== null, 'Enter a valid Kenyan phone number'),
  email:        z.string().trim().email('Enter a valid email').or(z.literal('')).optional(),
  message:      z.string().trim().max(1000).optional(),
  company_website: z.string().optional(), // honeypot — must stay empty
})

export type LeadFormValues = z.infer<typeof leadFormSchema>

export function isHoneypotTripped(v: Pick<LeadFormValues, 'company_website'>): boolean {
  return !!v.company_website && v.company_website.trim().length > 0
}

export interface LeadPayload {
  name: string
  propertyName: string
  propertyType: string
  phone: string
  email?: string
  message?: string
  source: 'LANDING_FORM'
  status: 'NEW'
}

export function buildLeadPayload(v: LeadFormValues): LeadPayload {
  const payload: LeadPayload = {
    name: v.name.trim(),
    propertyName: v.propertyName?.trim() ?? '',
    propertyType: v.propertyType.trim(),
    phone: normalizeKenyanPhone(v.phone) ?? v.phone.trim(),
    source: 'LANDING_FORM',
    status: 'NEW',
  }
  if (v.email && v.email.trim()) payload.email = v.email.trim()
  if (v.message && v.message.trim()) payload.message = v.message.trim()
  return payload
}
