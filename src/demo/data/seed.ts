import type {
  DemoState, DemoUnit, DemoTenant, DemoBlock,
} from './types'

const BLOCKS: DemoBlock[] = [
  { id: 'A', name: 'Block A' }, { id: 'B', name: 'Block B' },
  { id: 'C', name: 'Block C' }, { id: 'D', name: 'Block D' },
]

// Fictional name pool (cycled deterministically for occupied units).
const NAMES = [
  'John Kamau', 'Mary Wanjiku', 'Jane Njeri', 'Peter Otieno', 'Grace Achieng',
  'Samuel Kiptoo', 'Faith Mwende', 'Brian Ochieng', 'Cynthia Wairimu', 'Daniel Mutua',
  'Esther Nyambura', 'Kevin Barasa', 'Lucy Chebet', 'Michael Onyango', 'Nancy Adhiambo',
  'Paul Kariuki', 'Ruth Naliaka', 'Stephen Maina', 'Teresa Akinyi', 'Victor Kimani',
]
const PHONES = ['+254712000001', '+254712000002', '+254712000003', '+254712000004']

// A unit is vacant when its 1-based index within the block is 4 or 5 (mod 6).
// 8 vacant / 16 occupied per block. Keeps A-101/102/103 and A-204 occupied.
function isVacant(idx: number): boolean { const m = idx % 6; return m === 4 || m === 5 }

// A few showcase units carry a light previous-tenant history; the rest are empty.
const PREVIOUS: Record<string, string[]> = {
  'A-204': ['Kevin Barasa (2022–2024)'],
  'B-103': ['Nancy Adhiambo (2021–2023)'],
}

function buildUnits(): { units: DemoUnit[]; tenants: DemoTenant[] } {
  const units: DemoUnit[] = []
  const tenants: DemoTenant[] = []
  let nameIdx = 0
  for (const b of BLOCKS) {
    let idx = 0
    for (let floor = 1; floor <= 6; floor++) {
      for (let n = 1; n <= 4; n++) {
        idx++
        const unitNumber = `${b.id}-${floor}${String(n).padStart(2, '0')}`
        const vacant = isVacant(idx)
        let tenantName: string | null = null
        if (!vacant) {
          tenantName =
            unitNumber === 'A-101' ? 'John Kamau' :
            unitNumber === 'A-102' ? 'Mary Wanjiku' :
            unitNumber === 'A-103' ? 'Jane Njeri' :
            unitNumber === 'A-204' ? 'Michael Otieno' :
            NAMES[nameIdx % NAMES.length]
          nameIdx++
          tenants.push({ id: `t-${unitNumber}`, name: tenantName, unitNumber, phone: PHONES[tenants.length % PHONES.length] })
        }
        units.push({ id: unitNumber, blockId: b.id, unitNumber, status: vacant ? 'VACANT' : 'OCCUPIED', tenantName, previousTenants: PREVIOUS[unitNumber] ?? [] })
      }
    }
  }
  return { units, tenants }
}

export function seed(): DemoState {
  const { units, tenants } = buildUnits()
  return {
    role: null,
    property: { name: 'Greenview Apartments', location: 'Nairobi, Kenya', residentCount: 142 },
    blocks: BLOCKS,
    units,
    tenants,
    visitors: [
      { id: 'v-1', name: 'James Mwangi', unitNumber: 'A-204', type: 'FRIENDLY_VISIT', status: 'INSIDE', checkInLabel: '12:42 PM' },
      { id: 'v-2', name: 'Grace Njeri', unitNumber: 'B-103', type: 'SERVICE_PROVIDER', status: 'INSIDE', checkInLabel: '12:18 PM' },
    ],
    deliveries: [
      { id: 'd-1', company: 'Uber Eats', unitNumber: 'A-204', expectedLabel: '12:45 PM', status: 'EXPECTED' },
      { id: 'd-2', company: 'Courier', unitNumber: 'B-102', expectedLabel: '1:15 PM', status: 'EXPECTED' },
      { id: 'd-3', company: 'FedEx', unitNumber: 'C-301', expectedLabel: '2:30 PM', status: 'EXPECTED' },
      { id: 'd-4', company: 'Amazon', unitNumber: 'A-103', expectedLabel: '3:00 PM', status: 'EXPECTED' },
    ],
    incidents: [
      { id: 'i-1', type: 'Suspicious Person', location: 'Block B', reportedBy: 'John Kamau', timeLabel: '12:51 PM', status: 'OPEN' },
    ],
    staff: [
      { id: 's-1', name: 'Mercy Njeri', role: 'Property Manager', status: 'ACTIVE' },
      { id: 's-2', name: 'Anthony Kimani', role: 'Security Guard', status: 'ACTIVE' },
      { id: 's-3', name: 'David Mwangi', role: 'Security Guard', status: 'INACTIVE' },
      { id: 's-4', name: 'Samuel Kiptoo', role: 'Security Guard', status: 'INACTIVE' },
      { id: 's-5', name: 'Peter Otieno', role: 'Caretaker', status: 'ACTIVE' },
    ],
    activity: [
      { id: 'a-1', kind: 'CHECK_IN', title: 'James Mwangi checked in', subtitle: 'A-204 · Personal', timeLabel: '12:18 PM' },
      { id: 'a-2', kind: 'CHECK_OUT', title: 'Mary Wanjiku checked out', subtitle: 'B-103 · Personal', timeLabel: '12:04 PM' },
      { id: 'a-3', kind: 'DELIVERY', title: 'Delivery registered', subtitle: 'A-103 · Uber Eats', timeLabel: '11:52 AM' },
      { id: 'a-4', kind: 'CHECK_IN', title: 'Peter Otieno checked in', subtitle: 'C-301 · Service Provider', timeLabel: '11:21 AM' },
      { id: 'a-5', kind: 'INCIDENT', title: 'Incident reported', subtitle: 'Block B · Suspicious Person', timeLabel: '09:32 AM' },
    ],
    shifts: [
      { staffId: 's-2', status: 'OFF', startedLabel: null },
      { staffId: 's-5', status: 'OFF', startedLabel: null },
    ],
    approvals: [
      { id: 'ap-1', visitorId: 'v-pending-1', visitorName: 'Cynthia Wairimu', unitNumber: 'D-102', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' },
      { id: 'ap-2', visitorId: 'v-pending-2', visitorName: 'Samuel Kariuki', unitNumber: 'A-204', purpose: 'Personal visit', type: 'FRIENDLY_VISIT' },
    ],
  }
}
