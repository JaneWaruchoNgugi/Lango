import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { salonSeed, type SalonDemoState, type SalonDemoRole } from './data'
import type { SalonServiceType, SalonPaymentMethod } from '../../types'

export interface NewServiceInput { type: SalonServiceType; style: string; providerId: string; price: number }

interface Actions {
  setRole: (role: SalonDemoRole) => void
  registerClient: (input: { name: string; phone: string; services: NewServiceInput[] }) => string
  completeService: (serviceId: string) => void
  checkout: (clientId: string, input: { method: SalonPaymentMethod; mpesaCode?: string }) => void
  toggleProvider: (providerId: string) => void
  resetDemo: () => void
}

export type SalonDemoStore = SalonDemoState & Actions

const nowLabel = () => new Date().toLocaleTimeString('en-KE', { hour: 'numeric', minute: '2-digit' })

export const useSalonDemo = create<SalonDemoStore>()(
  persist(
    (set, get) => ({
      ...salonSeed(),
      setRole: (role) => set({ role }),
      registerClient: ({ name, phone, services }) => {
        const id = `c-${crypto.randomUUID()}`
        set(s => ({
          clients: [{ id, name, phone, arrivedLabel: nowLabel(), status: 'ACTIVE' as const }, ...s.clients],
          services: [
            ...services.map(sv => ({ id: `sv-${crypto.randomUUID()}`, clientId: id, done: false, minutesAgo: 0, ...sv })),
            ...s.services,
          ],
        }))
        return id
      },
      completeService: (serviceId) => set(s => ({
        services: s.services.map(sv => sv.id === serviceId ? { ...sv, done: true } : sv),
      })),
      checkout: (clientId, { method, mpesaCode }) => set(s => {
        const client = s.clients.find(c => c.id === clientId)
        if (!client || client.status !== 'ACTIVE') return {}
        const total = s.services.filter(sv => sv.clientId === clientId).reduce((n, sv) => n + sv.price, 0)
        return {
          clients: s.clients.map(c => c.id === clientId ? { ...c, status: 'CHECKED_OUT' as const } : c),
          services: s.services.map(sv => sv.clientId === clientId ? { ...sv, done: true } : sv),
          checkouts: [{ id: `k-${crypto.randomUUID()}`, clientId, clientName: client.name, total, method, mpesaCode, timeLabel: nowLabel(), day: 0 as const }, ...s.checkouts],
        }
      }),
      toggleProvider: (providerId) => set(s => ({
        providers: s.providers.map(p => p.id === providerId ? { ...p, active: !p.active } : p),
      })),
      resetDemo: () => set({ ...salonSeed(), role: get().role }),
    }),
    {
      name: 'lango-salon-demo',
      version: 1,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        role: s.role, salon: s.salon, providers: s.providers, clients: s.clients, services: s.services, checkouts: s.checkouts,
      }),
    },
  ),
)

export const fmtKes = (n: number) => `KES ${n.toLocaleString('en-KE')}`
export const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('')
