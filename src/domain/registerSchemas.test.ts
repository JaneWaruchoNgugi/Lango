import { describe, it, expect } from 'vitest'
import { registerGuestSchema } from './registerSchemas'

const base = {
  visitorName: 'John Mwangi', phone: '0712345678', idNumber: '12345678',
  nationality: 'Kenyan', blockId: 'b1', unitId: 'u1',
}

describe('registerGuestSchema', () => {
  it('accepts a valid friendly visit', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'FRIENDLY_VISIT', reason: 'Family' })
    expect(r.success).toBe(true)
  })

  it('rejects a service provider with no serviceType', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'SERVICE_PROVIDER', serviceType: '' })
    expect(r.success).toBe(false)
  })

  it('accepts a service provider with a serviceType', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'SERVICE_PROVIDER', serviceType: 'Internet installation' })
    expect(r.success).toBe(true)
  })

  it('rejects work with no workType/description', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'WORK', workType: '', workDescription: '' })
    expect(r.success).toBe(false)
  })

  it('requires a unit for every type', () => {
    const r = registerGuestSchema.safeParse({ ...base, unitId: '', visitType: 'FRIENDLY_VISIT' })
    expect(r.success).toBe(false)
  })
})
