import { describe, it, expect } from 'vitest'
import { seed } from './seed'

describe('demo seed', () => {
  it('has Greenview Apartments with 142 residents', () => {
    const s = seed()
    expect(s.property.name).toBe('Greenview Apartments')
    expect(s.property.residentCount).toBe(142)
  })

  it('has 4 blocks and 96 units', () => {
    const s = seed()
    expect(s.blocks).toHaveLength(4)
    expect(s.units).toHaveLength(96)
  })

  it('assigns the brief units correctly', () => {
    const u = seed().units
    const byNumber = (n: string) => u.find(x => x.unitNumber === n)!
    expect(byNumber('A01').tenantName).toBe('John Kamau')
    expect(byNumber('A02').tenantName).toBe('Mary Wanjiku')
    expect(byNumber('A03').tenantName).toBe('Jane Njeri')
    expect(byNumber('A04').status).toBe('VACANT')
    expect(byNumber('A05').status).toBe('VACANT')
  })

  it('tenants list matches occupied units', () => {
    const s = seed()
    const occupied = s.units.filter(u => u.status === 'OCCUPIED')
    expect(s.tenants).toHaveLength(occupied.length)
  })

  it('has 3 guards, 1 caretaker and the manager', () => {
    const s = seed()
    expect(s.staff.filter(x => x.role === 'Security Guard')).toHaveLength(3)
    expect(s.staff.filter(x => x.role === 'Caretaker')).toHaveLength(1)
    expect(s.staff.some(x => x.name === 'Mercy Njeri' && x.role === 'Property Manager')).toBe(true)
  })

  it('has 2 visitors inside, 1 pending approval, 1 open incident', () => {
    const s = seed()
    expect(s.visitors.filter(v => v.status === 'INSIDE')).toHaveLength(2)
    expect(s.approvals).toHaveLength(1)
    expect(s.incidents.filter(i => i.status === 'OPEN')).toHaveLength(1)
  })

  it('is deterministic (two seeds are deeply equal)', () => {
    expect(seed()).toEqual(seed())
  })
})
