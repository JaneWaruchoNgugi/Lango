import { describe, it, expect, beforeEach } from 'vitest'
import { useSalonDemo } from './store'
import { salonSeed } from './data'

describe('salon demo store', () => {
  beforeEach(() => useSalonDemo.getState().resetDemo())

  it('registers a client with services and marks them active', () => {
    const id = useSalonDemo.getState().registerClient({
      name: 'Test Client', phone: '0700000000',
      services: [{ type: 'MANICURE', style: '', providerId: 'p-2', price: 800 }],
    })
    const s = useSalonDemo.getState()
    expect(s.clients.find(c => c.id === id)?.status).toBe('ACTIVE')
    expect(s.services.filter(x => x.clientId === id)).toHaveLength(1)
  })

  it('checkout records the total, closes the visit and completes services', () => {
    const before = useSalonDemo.getState().checkouts.length
    useSalonDemo.getState().checkout('c-1', { method: 'MPESA', mpesaCode: 'ABCDEF1234' })
    const s = useSalonDemo.getState()
    expect(s.checkouts).toHaveLength(before + 1)
    expect(s.checkouts[0]).toMatchObject({ clientId: 'c-1', total: 4300, method: 'MPESA', day: 0 })
    expect(s.clients.find(c => c.id === 'c-1')?.status).toBe('CHECKED_OUT')
    expect(s.services.filter(x => x.clientId === 'c-1').every(x => x.done)).toBe(true)
  })

  it('does not check out the same client twice', () => {
    useSalonDemo.getState().checkout('c-1', { method: 'CASH' })
    const n = useSalonDemo.getState().checkouts.length
    useSalonDemo.getState().checkout('c-1', { method: 'CASH' })
    expect(useSalonDemo.getState().checkouts).toHaveLength(n)
  })

  it('reset restores the seed', () => {
    useSalonDemo.getState().completeService('sv-1')
    useSalonDemo.getState().resetDemo()
    expect(useSalonDemo.getState().services).toEqual(salonSeed().services)
  })
})
