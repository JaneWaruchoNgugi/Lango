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

  it('assigns the brief units correctly (floor-based numbering)', () => {
    const u = seed().units
    const byNumber = (n: string) => u.find(x => x.unitNumber === n)!
    expect(byNumber('A-101').tenantName).toBe('John Kamau')
    expect(byNumber('A-102').tenantName).toBe('Mary Wanjiku')
    expect(byNumber('A-103').tenantName).toBe('Jane Njeri')
    expect(byNumber('A-204').status).toBe('OCCUPIED')
    expect(byNumber('B-103').status).toBe('OCCUPIED')
  })

  it('uses floor-based unit numbers', () => {
    const nums = seed().units.map(u => u.unitNumber)
    expect(nums).toContain('A-101')
    expect(nums).toContain('A-604')
    expect(nums).not.toContain('A01')
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

  it('has 2 visitors inside, 2 pending approvals, 1 open incident', () => {
    const s = seed()
    expect(s.visitors.filter(v => v.status === 'INSIDE')).toHaveLength(2)
    expect(s.approvals).toHaveLength(2)
    expect(s.incidents.filter(i => i.status === 'OPEN')).toHaveLength(1)
  })

  it('seeds shifts for both the guard (s-2) and the caretaker (s-5)', () => {
    const s = seed()
    expect(s.shifts.find(x => x.staffId === 's-2')).toBeTruthy()
    expect(s.shifts.find(x => x.staffId === 's-5')).toBeTruthy()
  })

  it('assigns Michael Otieno to A-204 and renames guard s-2 to Anthony Kimani', () => {
    const s = seed()
    expect(s.units.find(u => u.unitNumber === 'A-204')!.tenantName).toBe('Michael Otieno')
    expect(s.staff.find(m => m.id === 's-2')!.name).toBe('Anthony Kimani')
  })

  it('seeds all four deliveries as EXPECTED', () => {
    const s = seed()
    expect(s.deliveries).toHaveLength(4)
    expect(s.deliveries.every(d => d.status === 'EXPECTED')).toBe(true)
  })

  it('is deterministic (two seeds are deeply equal)', () => {
    expect(seed()).toEqual(seed())
  })
})
