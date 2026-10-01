import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, query, where, Timestamp, onSnapshot } from 'firebase/firestore'
import { db } from '../../../firebase/config'
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
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="page-title">Reception</h1>
        <p className="page-subtitle">Today · {format(new Date(), 'd MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Active Now</p>
          <p className="text-3xl font-bold text-lango-primary">{active.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Checked Out</p>
          <p className="text-3xl font-bold text-gray-900">{checkedOut.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total Today</p>
          <p className="text-3xl font-bold text-gray-900">{clients.length}</p>
        </div>
      </div>

      <div className="flex gap-3">
        {canCreateClients && (
          <Link to={`/salon/${salonId}/receptionist/clients`} className="btn-primary">
            <UserPlus className="w-4 h-4" /> Register Client
          </Link>
        )}
        {canViewPayments && (
          <Link to={`/salon/${salonId}/receptionist/checkout`} className="btn-secondary">
            <ShoppingBag className="w-4 h-4" /> Checkout
          </Link>
        )}
      </div>

      {active.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <Users className="w-4 h-4 text-lango-primary" />
            <h3 className="section-title mb-0">Currently Active ({active.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {active.map(c => (
              <div key={c.clientId} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {canViewPhone ? c.phone : '•••••••••••'} · {format(c.createdAt.toDate(), 'h:mm a')}
                  </p>
                </div>
                <Link to={`/salon/${salonId}/receptionist/checkout?client=${c.clientId}`}
                  className="btn-secondary text-xs">Checkout</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
