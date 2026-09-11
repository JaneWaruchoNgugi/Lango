import { Modal } from '../../components/ui/Modal'
import { TenantStatusBadge } from '../../components/ui/StatusBadge'
import { formatDateLong, tenancyLength } from '../../utils/format'
import type { Tenant } from '../../types'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right">{value}</span>
    </div>
  )
}

export function TenantDetailDrawer({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  if (!tenant) return null
  const activeDash = tenant.status === 'ACTIVE'
  return (
    <Modal isOpen={!!tenant} onClose={onClose} title={tenant.fullName}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 pb-2"><TenantStatusBadge status={tenant.status} /></div>
        <Row label="Unit" value={`${tenant.blockName ? tenant.blockName + ' • ' : ''}${tenant.unitNumber}`} />
        <Row label="Phone" value={tenant.phoneNumber} />
        {tenant.whatsappNumber && tenant.whatsappNumber !== tenant.phoneNumber && <Row label="WhatsApp" value={tenant.whatsappNumber} />}
        {tenant.email && <Row label="Email" value={tenant.email} />}
        {tenant.nationalId && <Row label="National ID" value={tenant.nationalId} />}
        <Row label="Move-in date" value={formatDateLong(tenant.moveInDate)} />
        <Row label="Move-out date" value={tenant.moveOutDate ? formatDateLong(tenant.moveOutDate) : '—'} />
        <Row label={activeDash ? 'Tenancy so far' : 'Tenancy length'} value={tenancyLength(tenant.moveInDate, tenant.moveOutDate)} />
        {tenant.emergencyContact && <Row label="Emergency contact" value={`${tenant.emergencyContact.name} (${tenant.emergencyContact.relationship}) · ${tenant.emergencyContact.phone}`} />}
        {tenant.notes && (
          <div className="pt-3">
            <p className="text-sm text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{tenant.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
