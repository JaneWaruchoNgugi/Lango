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

  it('rejects a delivery with no company', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'DELIVERY', company: '' })
    expect(r.success).toBe(false)
  })

  it('accepts work with a blank expected duration', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'WORK', workType: 'Plumbing', workDescription: 'Fix sink', expectedDurationMins: '' })
    expect(r.success).toBe(true)
  })

  it('accepts work with a numeric expected duration', () => {
    const r = registerGuestSchema.safeParse({ ...base, visitType: 'WORK', workType: 'Plumbing', workDescription: 'Fix sink', expectedDurationMins: '45' })
    expect(r.success).toBe(true)
  })
})

const baseFriendly = { visitType: 'FRIENDLY_VISIT', visitorName: 'Jane', phone: '0712345678', blockId: 'b1', unitId: 'u1' }

describe('visitor detail fields', () => {
  it('accepts gatePassNumber, vehicleType, vehicleDescription, itemsBroughtIn on friendly', () => {
    const r = registerGuestSchema.safeParse({ ...baseFriendly, gatePassNumber: 'P12', vehicleType: 'CAR', vehicleDescription: 'white Toyota', itemsBroughtIn: 'laptop' })
    expect(r.success).toBe(true)
  })

  it('accepts omitting all new fields', () => {
    expect(registerGuestSchema.safeParse(baseFriendly).success).toBe(true)
  })

  it('rejects an invalid vehicleType', () => {
    expect(registerGuestSchema.safeParse({ ...baseFriendly, vehicleType: 'PLANE' }).success).toBe(false)
  })

  it('treats an empty vehicleType string as omitted (blank select)', () => {
    const r = registerGuestSchema.safeParse({ ...baseFriendly, vehicleType: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.vehicleType).toBeUndefined()
  })

  it('accepts itemsBroughtIn on work and service', () => {
    expect(registerGuestSchema.safeParse({ visitType: 'WORK', visitorName: 'Bob', phone: '0712345678', blockId: 'b1', unitId: 'u1', workType: 'Plumbing', itemsBroughtIn: 'wrench' }).success).toBe(true)
    expect(registerGuestSchema.safeParse({ visitType: 'SERVICE_PROVIDER', visitorName: 'Sue', phone: '0712345678', blockId: 'b1', unitId: 'u1', serviceType: 'Internet', itemsBroughtIn: 'router' }).success).toBe(true)
  })

  it('strips itemsBroughtIn from a delivery (not part of its schema)', () => {
    const r = registerGuestSchema.safeParse({ visitType: 'DELIVERY', visitorName: 'Rider', phone: '0712345678', blockId: 'b1', unitId: 'u1', company: 'Glovo', itemsBroughtIn: 'x', gatePassNumber: 'P9' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect('itemsBroughtIn' in r.data).toBe(false)
      expect('gatePassNumber' in r.data).toBe(true)
    }
  })
})
