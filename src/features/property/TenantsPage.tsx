import { useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTenants } from '../../hooks/useTenants'
import { useUnitsWithTenants } from '../../hooks/useUnitsWithTenants'
import { filterTenants, moveOutTenant } from '../../services/tenantService'
import { canManageTenants } from '../../domain/permissions'
import { TenantStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { ConfirmDialog } from '../../components/ui/Modal'
import { TenantFormDrawer } from './TenantFormDrawer'
import { UserCheck, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Tenant } from '../../types'

export default function TenantsPage() {
  const { user } = useAuth()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Caretaker', role: user?.role ?? 'CARETAKER' as const }
  const canManage = canManageTenants(user?.role)
  const [includeMovedOut, setIncludeMovedOut] = useState(false)
  const { tenants, loading, reload } = useTenants(user?.propertyId, includeMovedOut ? undefined : 'ACTIVE')
  const { units, reload: reloadUnits } = useUnitsWithTenants(user?.propertyId)
  const [term, setTerm] = useState('')
  const [drawer, setDrawer] = useState<{ open: boolean; editing: Tenant | null }>({ open: false, editing: null })
  const [moveOut, setMoveOut] = useState<Tenant | null>(null)
  const [busy, setBusy] = useState(false)

  const vacantUnits = useMemo(() => units.filter(u => u.status === 'VACANT'), [units])
  const shown = useMemo(() => filterTenants(tenants, term), [tenants, term])

  const doMoveOut = async (t: Tenant) => {
    setBusy(true)
    try { await moveOutTenant(t, actor); toast.success(`${t.fullName} moved out`); reload(); reloadUnits() }
    catch (e) { console.error(e); toast.error('Move-out failed') } finally { setBusy(false); setMoveOut(null) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="page-title">Tenants</h1>
        {canManage && <button className="btn-primary" onClick={() => setDrawer({ open: true, editing: null })}><Plus className="w-4 h-4" /> Add tenant</button>}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input className="input max-w-sm" placeholder="Search name / phone / unit…" value={term} onChange={e => setTerm(e.target.value)} />
        <label className="text-sm text-gray-600 flex items-center gap-2"><input type="checkbox" checked={includeMovedOut} onChange={e => setIncludeMovedOut(e.target.checked)} /> Include moved-out</label>
      </div>

      {shown.length === 0 ? <EmptyState icon={UserCheck} title="No tenants" description="Add a tenant to a vacant unit." /> : (
        <div className="card divide-y divide-gray-50">
          {shown.map(t => (
            <div key={t.tenantId} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{t.fullName}</span><TenantStatusBadge status={t.status} /></div>
                <p className="text-xs text-gray-500">{t.blockName} • {t.unitNumber} · {t.phoneNumber}</p>
              </div>
              {canManage && (
                <div className="flex gap-2 flex-shrink-0">
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
      <ConfirmDialog isOpen={!!moveOut} onClose={() => setMoveOut(null)} onConfirm={() => moveOut && doMoveOut(moveOut)}
        title="Move out tenant" message={`Move ${moveOut?.fullName} out of ${moveOut?.unitNumber}? The unit becomes vacant; history is preserved.`} confirmLabel="Move out" loading={busy} />
    </div>
  )
}
