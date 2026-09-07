import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getDocs } from 'firebase/firestore'
import { propertiesCol, subscriptionsCol } from '../../firebase/collections'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import { CreditCard, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { SUBSCRIPTION_PLANS } from '../../types'
import type { Property, Subscription, SubscriptionStatus } from '../../types'

const statusBadge: Record<SubscriptionStatus, string> = {
  ACTIVE:    'badge-green',
  TRIAL:     'badge-blue',
  PAST_DUE:  'badge-orange',
  SUSPENDED: 'badge-red',
  CANCELLED: 'badge-gray',
}

/** Fallback status derived from the property when no subscription doc exists yet. */
const propertyToSubStatus: Record<Property['status'], SubscriptionStatus> = {
  ACTIVE:    'ACTIVE',
  TRIAL:     'TRIAL',
  SUSPENDED: 'SUSPENDED',
  ARCHIVED:  'CANCELLED',
}

interface Row {
  property: Property
  status: SubscriptionStatus
  monthlyPrice: number
  renewalDate: Subscription['renewalDate'] | null
}

export default function SubscriptionsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [propSnap, subSnap] = await Promise.all([
          getDocs(propertiesCol),
          getDocs(subscriptionsCol),
        ])
        const subsByProperty = new Map<string, Subscription>()
        subSnap.docs.forEach(d => {
          const s = d.data()
          subsByProperty.set(s.propertyId, s)
        })
        const built = propSnap.docs.map(d => {
          const property = d.data()
          const sub = subsByProperty.get(property.propertyId)
          const plan = SUBSCRIPTION_PLANS[property.plan]
          return {
            property,
            status: sub?.status ?? propertyToSubStatus[property.status],
            monthlyPrice: sub?.price ?? plan.monthlyPrice,
            renewalDate: sub?.renewalDate ?? null,
          } satisfies Row
        }).sort((a, b) => a.property.name.localeCompare(b.property.name))
        setRows(built)
      } catch (err) {
        console.error('Subscriptions load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const activeRows = rows.filter(r => r.status === 'ACTIVE' || r.status === 'TRIAL')
  const mrr = activeRows.reduce((sum, r) => sum + r.monthlyPrice, 0)
  const trials = rows.filter(r => r.status === 'TRIAL').length
  const pastDue = rows.filter(r => r.status === 'PAST_DUE' || r.status === 'SUSPENDED').length

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Subscriptions</h1>
        <p className="page-subtitle">Billing plans and renewals across all properties.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Monthly Recurring" value={`KES ${mrr.toLocaleString()}`} color="text-lango-primary" />
        <Stat label="Active / Trial" value={activeRows.length.toString()} color="text-green-600" />
        <Stat label="On Trial" value={trials.toString()} color="text-blue-600" />
        <Stat label="Past Due / Suspended" value={pastDue.toString()} color="text-red-600" />
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="section-title mb-0">All Properties ({rows.length})</h3>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={CreditCard} title="No subscriptions" description="Add a property to start tracking billing." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>Property</th><th>Plan</th><th>Monthly</th><th>Status</th><th>Renews</th></tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.property.propertyId}>
                    <td>
                      <Link to={`/admin/properties/${r.property.propertyId}`} className="font-medium text-lango-primary hover:underline flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> {r.property.name}
                      </Link>
                    </td>
                    <td>{SUBSCRIPTION_PLANS[r.property.plan].name}</td>
                    <td className="tabular-nums">KES {r.monthlyPrice.toLocaleString()}</td>
                    <td><span className={`badge ${statusBadge[r.status]}`}>{r.status.replace(/_/g, ' ')}</span></td>
                    <td className="text-gray-500 text-xs">{r.renewalDate ? format(r.renewalDate.toDate(), 'dd MMM yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
