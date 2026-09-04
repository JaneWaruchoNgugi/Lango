import type { VisitType } from '../types'

export const VISIT_TYPE_OPTIONS: { value: VisitType; label: string; emoji: string; hint: string }[] = [
  { value: 'FRIENDLY_VISIT',   label: 'Friendly Visit',   emoji: '👤', hint: 'Visiting a tenant personally' },
  { value: 'WORK',             label: 'Work',             emoji: '🔧', hint: 'Construction, maintenance, repair or other work' },
  { value: 'DELIVERY',         label: 'Delivery',         emoji: '📦', hint: 'Food, parcel, courier or other delivery' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider', emoji: '🛠️', hint: 'Professional service being provided' },
]

export const VISIT_TYPE_LABEL: Record<VisitType, string> = {
  FRIENDLY_VISIT: 'Friendly Visit',
  WORK: 'Work',
  DELIVERY: 'Delivery',
  SERVICE_PROVIDER: 'Service Provider',
}

export const WORK_TYPES = [
  'Plumbing', 'Electrical', 'Construction', 'Painting', 'Repair', 'Installation', 'Other',
] as const

export const SERVICE_TYPES = [
  'Plumbing', 'Electrical repair', 'Internet installation', 'Cleaning', 'Pest control',
  'Air conditioning', 'Appliance repair', 'Moving service', 'Security system installation', 'Other',
] as const

export const DELIVERY_KINDS = [
  'Food', 'Parcel', 'Groceries', 'Documents', 'Courier', 'Other',
] as const
