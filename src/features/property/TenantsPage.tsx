import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTenants } from '../../hooks/useTenants'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { filterTenants, moveOutTenant } from '../../services/tenantService'
import { canManageTenants } from '../../domain/permissions'
import { TenantStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { MoveOutDialog } from './MoveOutDialog'
import { TenantDetailDrawer } from './TenantDetailDrawer'
import { formatMonthYear } from '../../utils/format'
import { TenantFormDrawer } from './TenantFormDrawer'
import { Users, Plus, Search, Home, User, Filter, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Tenant } from '../../types'

type StatusFilter = 'ACTIVE' | 'MOVED_OUT' | 'ALL'

export default function TenantsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageTenants(user?.role)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE')
  const { tenants, loading, error, reload } = useTenants(user?.propertyId, statusFilter === 'ACTIVE' ? 'ACTIVE' : undefined)
  const { units, reload: reloadUnits } = useUnitsWithTenants(user?.propertyId)
  const [term, setTerm] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Tenant | null }>({ open: false, editing: null })
  const [moveOut, setMoveOut] = useState<Tenant | null>(null)
  const [detail, setDetail] = useState<Tenant | null>(null)
  const [busy, setBusy] = useState(false)

  const vacantUnits = useMemo(() => units.filter(u => u.status === 'VACANT'), [units])
  const shown = useMemo(() => {
    const list = filterTenants(tenants, term)
    return statusFilter === 'MOVED_OUT' ? list.filter(t => t.status === 'MOVED_OUT') : list
  }, [tenants, term, statusFilter])

  const doMoveOut = async (t: Tenant, moveOutDate: Date) => {
    setBusy(true)
    try { await moveOutTenant(t, actor, moveOutDate); toast.success(`${t.fullName} moved out`); reload(); reloadUnits() }
    catch (e) { console.error(e); toast.error(e instanceof Error ? e.message : 'Move-out failed') } finally { setBusy(false); setMoveOut(null) }
  }
  if (loading) return <PageLoader />

  const openAdd = () => setDrawer({ open: true, editing: null })

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><Users className="w-5 h-5 text-lango-primary" /></div>
          <div><h1 className="text-xl font-bold text-gray-900">Tenants</h1><p className="text-sm text-gray-500">Add and manage tenants for your units.</p></div>
        </div>
        {canManage && <button className="btn-primary" onClick={openAdd}><Plus className="w-4 h-4" /> Add Tenant</button>}
      </div>

      {/* Search + filters */}
      <div className="flex gap-2 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search by name, phone, unit or ID…" value={term} onChange={e => setTerm(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select className="input sm:w-40" value={statusFilter} onChange={e => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="ACTIVE">Active</option>
            <option value="MOVED_OUT">Moved out</option>
            <option value="ALL">All statuses</option>
          </select>
          <button className="btn-secondary shrink-0" title="Reset filters" onClick={() => { setTerm(''); setStatusFilter('ACTIVE') }}>
            <Filter className="w-4 h-4" /> <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-bold text-gray-900">Couldn't load tenants</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">{error}</p>
          <button className="btn-secondary mt-5" onClick={reload}>Try again</button>
        </div>
      ) : shown.length === 0 ? (
        <div className="card py-14 flex flex-col items-center text-center px-6">
          <div className="relative w-28 h-28 rounded-full bg-lango-primary/5 flex items-center justify-center mb-5">
            <User className="w-12 h-12 text-lango-primary/40" />
            <Home className="absolute top-6 right-7 w-6 h-6 text-lango-primary/40" />
            <div className="absolute bottom-5 right-6 w-7 h-7 rounded-full bg-lango-primary flex items-center justify-center ring-4 ring-white"><Plus className="w-4 h-4 text-white" /></div>
          </div>
          <h3 className="font-bold text-gray-900">No tenants</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">Add a tenant to a vacant unit.</p>
          {canManage && <button className="btn-primary mt-5" onClick={openAdd}><Plus className="w-4 h-4" /> Add Tenant</button>}
        </div>
      ) : (
        <div className="card divide-y divide-gray-50">
          {shown.map(t => (
            <div key={t.tenantId} className="px-4 py-3 flex items-center justify-between gap-4">
              <button type="button" className="min-w-0 text-left" onClick={() => setDetail(t)}>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900 truncate hover:text-lango-primary">{t.fullName}</span><TenantStatusBadge status={t.status} /></div>
                <p className="text-xs text-gray-500 truncate">{t.blockName} • {t.unitNumber} · {t.phoneNumber}</p>
                <p className="text-xs text-gray-400 truncate">
                  {t.status === 'MOVED_OUT' && t.moveOutDate
                    ? `${formatMonthYear(t.moveInDate)} – ${formatMonthYear(t.moveOutDate)}`
                    : `Since ${formatMonthYear(t.moveInDate)}`}
                </p>
              </button>
              {canManage && (
                <div className="flex gap-2 shrink-0">
                  <button className="btn-secondary text-xs" onClick={() => setDrawer({ open: true, editing: t })}>Edit</button>
                  {t.status === 'ACTIVE' && <button className="btn-danger text-xs" onClick={() => setMoveOut(t)}>Move out</button>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <TenantFormDrawer isOpen={drawer.open} editing={drawer.editing} onClose={() => setDrawer({ open: false, editing: null })}
        onDone={() => { reload(); reloadUnits() }} actor={actor} propertyId={user?.propertyId ?? ''} vacantUnits={vacantUnits} />
      <MoveOutDialog key={moveOut?.tenantId ?? 'none'} tenant={moveOut} loading={busy} onClose={() => setMoveOut(null)} onConfirm={(date) => moveOut && doMoveOut(moveOut, date)} />
      <TenantDetailDrawer tenant={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
