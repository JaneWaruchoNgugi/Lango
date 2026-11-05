import type { SalonServiceType, SalonPaymentMethod } from '../../types'

export type SalonDemoRole = 'OWNER' | 'RECEPTION' | 'PROVIDER'

export interface SalonDemoProvider { id: string; code: string; name: string; phone: string; services: SalonServiceType[]; active: boolean }
export interface SalonDemoService {
  id: string; clientId: string; type: SalonServiceType; style: string
  providerId: string; price: number; done: boolean; minutesAgo: number
}
export interface SalonDemoClient { id: string; name: string; phone: string; arrivedLabel: string; status: 'ACTIVE' | 'CHECKED_OUT' }
export interface SalonDemoCheckout {
  id: string; clientId: string; clientName: string; total: number
  method: SalonPaymentMethod; mpesaCode?: string; timeLabel: string; day: 0 | 1 | 2 | 3 | 4 | 5 | 6
}

export interface SalonDemoState {
  role: SalonDemoRole | null
  salon: { name: string; location: string }
  providers: SalonDemoProvider[]
  clients: SalonDemoClient[]
  services: SalonDemoService[]
  checkouts: SalonDemoCheckout[]
}

/** The provider the "Provider" demo role signs in as. */
export const DEMO_PROVIDER_ID = 'p-1'

/** Typical Nairobi salon prices (KES) used to prefill the register form. */
export const DEFAULT_PRICE: Partial<Record<SalonServiceType, number>> = {
  HAIR_UNDOING: 500, HAIR_WASHING: 400, BLOW_DRY: 700, HAIR_DRESSING: 2500,
  MANICURE: 800, PEDICURE: 1000, LASH_SERVICE: 1500,
}

export function salonSeed(): SalonDemoState {
  return {
    role: null,
    salon: { name: 'Amani Beauty Studio', location: 'Kilimani, Nairobi' },
    providers: [
      { id: 'p-1', code: 'AB001WN', name: 'Wanjiru Njoroge', phone: '+254 722 410 118', services: ['HAIR_DRESSING', 'BLOW_DRY'], active: true },
      { id: 'p-2', code: 'AB002AK', name: 'Akinyi Otieno', phone: '+254 711 902 334', services: ['MANICURE', 'PEDICURE'], active: true },
      { id: 'p-3', code: 'AB003MW', name: 'Mercy Wambui', phone: '+254 733 120 556', services: ['HAIR_WASHING', 'HAIR_UNDOING'], active: true },
      { id: 'p-4', code: 'AB004ZM', name: 'Zawadi Mutua', phone: '+254 700 845 201', services: ['LASH_SERVICE'], active: true },
    ],
    clients: [
      { id: 'c-1', name: 'Faith Kendi', phone: '+254 712 300 441', arrivedLabel: '9:40 AM', status: 'ACTIVE' },
      { id: 'c-2', name: 'Lucy Achieng', phone: '+254 723 551 902', arrivedLabel: '10:15 AM', status: 'ACTIVE' },
      { id: 'c-3', name: 'Grace Mwende', phone: '+254 701 664 118', arrivedLabel: '8:30 AM', status: 'CHECKED_OUT' },
      { id: 'c-4', name: 'Sharon Chebet', phone: '+254 745 220 017', arrivedLabel: '8:55 AM', status: 'CHECKED_OUT' },
    ],
    services: [
      { id: 'sv-1', clientId: 'c-1', type: 'HAIR_DRESSING', style: 'Knotless braids', providerId: 'p-1', price: 3500, done: false, minutesAgo: 70 },
      { id: 'sv-2', clientId: 'c-1', type: 'MANICURE', style: 'Gel polish', providerId: 'p-2', price: 800, done: true, minutesAgo: 60 },
      { id: 'sv-3', clientId: 'c-2', type: 'HAIR_WASHING', style: 'Wash and treatment', providerId: 'p-3', price: 600, done: false, minutesAgo: 25 },
      { id: 'sv-4', clientId: 'c-2', type: 'BLOW_DRY', style: 'Silk press', providerId: 'p-1', price: 900, done: false, minutesAgo: 20 },
      { id: 'sv-5', clientId: 'c-3', type: 'LASH_SERVICE', style: 'Classic set', providerId: 'p-4', price: 1500, done: true, minutesAgo: 150 },
      { id: 'sv-6', clientId: 'c-4', type: 'PEDICURE', style: 'Spa pedicure', providerId: 'p-2', price: 1000, done: true, minutesAgo: 130 },
      { id: 'sv-7', clientId: 'c-4', type: 'BLOW_DRY', style: 'Blow-out', providerId: 'p-1', price: 700, done: true, minutesAgo: 120 },
    ],
    // day: 0 = today, 6 = six days ago. Gives the owner a week of history.
    checkouts: [
      { id: 'k-1', clientId: 'c-3', clientName: 'Grace Mwende', total: 1500, method: 'MPESA', mpesaCode: 'SKA41B7XQ2', timeLabel: '10:05 AM', day: 0 },
      { id: 'k-2', clientId: 'c-4', clientName: 'Sharon Chebet', total: 1700, method: 'CASH', timeLabel: '11:10 AM', day: 0 },
      { id: 'k-h1', clientId: 'h1', clientName: 'Janet Wairimu', total: 4200, method: 'MPESA', mpesaCode: 'SK9F2LMN71', timeLabel: 'Yesterday', day: 1 },
      { id: 'k-h2', clientId: 'h2', clientName: 'Ruth Nyambura', total: 2600, method: 'MPESA', mpesaCode: 'SK8D1PQR55', timeLabel: 'Yesterday', day: 1 },
      { id: 'k-h3', clientId: 'h3', clientName: 'Esther Kamau', total: 5100, method: 'CASH', timeLabel: '2 days ago', day: 2 },
      { id: 'k-h4', clientId: 'h4', clientName: 'Mary Atieno', total: 3300, method: 'MPESA', mpesaCode: 'SK7C0STU33', timeLabel: '3 days ago', day: 3 },
      { id: 'k-h5', clientId: 'h5', clientName: 'Joy Muthoni', total: 6400, method: 'MPESA', mpesaCode: 'SK6B9VWX12', timeLabel: '4 days ago', day: 4 },
      { id: 'k-h6', clientId: 'h6', clientName: 'Agnes Moraa', total: 2900, method: 'CASH', timeLabel: '5 days ago', day: 5 },
      { id: 'k-h7', clientId: 'h7', clientName: 'Tabitha Njeri', total: 3800, method: 'MPESA', mpesaCode: 'SK5A8YZA90', timeLabel: '6 days ago', day: 6 },
    ],
  }
}
