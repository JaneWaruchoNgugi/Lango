import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { PageHeader } from '../../../components/ui/PageHeader'
import { EmptyState } from '../../../components/ui/EmptyState'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { format, startOfDay } from 'date-fns'
import { UserPlus, ShoppingBag, Users } from 'lucide-react'
import { useSalonPermissions } from '../../../hooks/useSalonPermissions'
import type { SalonClient } from '../../../types'

export default function ReceptionistDashboard() {
  const { salonId } = useParams<{ salonId: string }>()
  const [clients, setClients]   = useState<SalonClient[]>([])
  const [loading, setLoading]   = useState(true)
  const { perms, isOwner }      = useSalonPermissions()
  const canCreateClients        = isOwner || perms?.createClients !== false
  const canViewPayments         = isOwner || perms?.viewPayments !== false
  const canViewPhone            = isOwner || perms?.viewPhone !== false

  useEffect(() => {
    if (!salonId) return
    const todayStart = Timestamp.fromDate(startOfDay(new Date()))
    const q = query(
      collection(db, 'salonClients'),
      where('salonId', '==', salonId),
      where('createdAt', '>=', todayStart),
    )
    return onSnapshot(q, snap => {
      setClients(snap.docs.map(d => d.data() as SalonClient)
        .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds))
      setLoading(false)
    }, err => { console.error(err); setLoading(false) })
  }, [salonId])

  const active   = clients.filter(c => c.status === 'ACTIVE')
  const checkedOut = clients.filter(c => c.status === 'CHECKED_OUT')

  if (loading) return <PageLoader />

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="Reception"
        subtitle={`Today · ${format(new Date(), 'EEEE, d MMMM yyyy')}`}
        className="!mb-0"
        actions={
          <>
            {canViewPayments && (
              <Link to={`/salon/${salonId}/receptionist/checkout`} className="btn-secondary">
                <ShoppingBag className="w-4 h-4" /> Checkout
              </Link>
            )}
            {canCreateClients && (
              <Link to={`/salon/${salonId}/receptionist/clients`} className="btn-primary">
                <UserPlus className="w-4 h-4" /> Register client
              </Link>
            )}
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: 'In the salon', value: active.length, accent: 'text-lango-primary', dot: 'bg-lango-primary' },
          { label: 'Checked out', value: checkedOut.length, accent: 'text-gray-900', dot: 'bg-emerald-500' },
          { label: 'Total today', value: clients.length, accent: 'text-gray-900', dot: 'bg-gray-300' },
        ].map(k => (
          <div key={k.label} className="card p-4 sm:p-5">
            <p className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500">
              <span className={`w-2 h-2 rounded-full ${k.dot}`} />{k.label}
            </p>
            <p className={`mt-2 font-display text-2xl sm:text-3xl font-bold ${k.accent}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="section-title mb-0">In the salon now</h3>
          <span className="badge badge-blue">{active.length}</span>
        </div>
        {active.length === 0 ? (
          <EmptyState icon={Users} title="No one waiting" description="Registered clients show here until they check out." />
        ) : (
          <div className="divide-y divide-gray-100">
            {active.map(c => (
              <div key={c.clientId} className="px-5 py-3.5 flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-lango-light text-lango-primary text-xs font-semibold flex items-center justify-center shrink-0">
                  {c.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {canViewPhone ? c.phone : '•••••••••••'} · Arrived {format(c.createdAt.toDate(), 'h:mm a')}
                  </p>
                </div>
                {canViewPayments && (
                  <Link to={`/salon/${salonId}/receptionist/checkout?client=${c.clientId}`}
                    className="btn-secondary text-xs">Checkout</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
