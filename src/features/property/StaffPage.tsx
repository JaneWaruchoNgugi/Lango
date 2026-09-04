import { useAuth } from '../../contexts/AuthContext'
import { useStaff } from '../../hooks/useStaff'
import { StaffStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Users } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = { SECURITY_GUARD: 'Security Guard', CARETAKER: 'Caretaker', PROPERTY_MANAGER: 'Property Manager' }

export default function StaffPage() {
  const { user } = useAuth()
  const { staff, onShift, loading } = useStaff(user?.propertyId)
  if (loading) return <PageLoader />
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div><h1 className="page-title">Staff</h1><p className="page-subtitle">Roster for your property (managed by the administrator).</p></div>
      {staff.length === 0 ? <EmptyState icon={Users} title="No staff yet" /> : (
        <div className="card divide-y divide-gray-50">
          {staff.map(s => (
            <div key={s.uid} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="font-medium text-gray-900">{s.name}</span>{s.role === 'SECURITY_GUARD' && onShift.has(s.uid) && <span className="badge badge-green text-xs">On shift</span>}</div>
                <p className="text-xs text-gray-500">{ROLE_LABEL[s.role] ?? s.role} · {s.phone ?? s.email}</p>
              </div>
              <StaffStatusBadge status={s.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
