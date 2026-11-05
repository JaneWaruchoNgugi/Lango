import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, orderBy, limit } from 'firebase/firestore'
import { notificationsCol } from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { Bell, DoorOpen, Package, AlertTriangle, Settings } from 'lucide-react'
import { format } from 'date-fns'
import type { Notification, NotificationType } from '../../types'
import { Chip } from '../../components/ui/Segmented'
import { humanize } from '../../utils/humanize'
import { PageHeader } from '../../components/ui/PageHeader'

const typeIcon: Record<NotificationType, typeof Bell> = {
  VISITOR_ALERT:  DoorOpen,
  DELIVERY_ALERT: Package,
  INCIDENT_ALERT: AlertTriangle,
  SYSTEM:         Settings,
}

const statusBadge: Record<Notification['status'], string> = {
  SENT:    'badge-green',
  PENDING: 'badge-yellow',
  FAILED:  'badge-red',
  MOCK:    'badge-gray',
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'ALL' | Notification['status']>('ALL')

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDocs(query(notificationsCol, orderBy('createdAt', 'desc'), limit(200)))
        setItems(snap.docs.map(d => d.data()))
      } catch (err) {
        console.error('Notifications load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const shown = useMemo(
    () => statusFilter === 'ALL' ? items : items.filter(n => n.status === statusFilter),
    [items, statusFilter],
  )
  const filters: ('ALL' | Notification['status'])[] = ['ALL', 'SENT', 'PENDING', 'FAILED', 'MOCK']

  if (loading) return <PageLoader />

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Notifications"
        subtitle="Alerts sent to tenants and staff."
        className="!mb-0"
        actions={
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1">
            {filters.map(f => (
              <Chip key={f} active={statusFilter === f} onClick={() => setStatusFilter(f)}>{f === 'ALL' ? 'All' : humanize(f)}</Chip>
            ))}
          </div>
        }
      />

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="section-title mb-0">Recent ({shown.length})</h3>
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="Visitor, delivery and incident alerts will appear here." />
        ) : (
          <div className="divide-y divide-gray-50">
            {shown.map(n => {
              const Icon = typeIcon[n.type] ?? Bell
              return (
                <div key={n.notificationId} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-8 h-8 bg-lango-light rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-lango-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{n.recipientName}</p>
                      <span className={`badge flex-shrink-0 ${statusBadge[n.status]}`}>{humanize(n.status)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.recipientPhone} · {n.provider}
                      {n.createdAt ? ` · ${format(n.createdAt.toDate(), 'dd MMM, h:mm a')}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
