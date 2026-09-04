import type { Visitor, VisitType, VisitorStatus } from '../../types'

export interface VisitorFilters {
  term?: string
  visitType?: VisitType
  status?: VisitorStatus
  blockId?: string
  unitId?: string
  guardId?: string
  tenantId?: string
}

export function filterVisitors(list: Visitor[], f: VisitorFilters): Visitor[] {
  const term = f.term?.trim().toLowerCase()
  return list.filter(v => {
    if (f.visitType && v.visitType !== f.visitType) return false
    if (f.status && v.status !== f.status) return false
    if (f.blockId && v.blockId !== f.blockId) return false
    if (f.unitId && v.unitId !== f.unitId) return false
    if (f.guardId && v.guardId !== f.guardId) return false
    if (f.tenantId && v.tenantId !== f.tenantId) return false
    if (term && !(
      v.visitorName.toLowerCase().includes(term) ||
      (v.tenantName ?? '').toLowerCase().includes(term) ||
      v.unitNumber.toLowerCase().includes(term)
    )) return false
    return true
  })
}
