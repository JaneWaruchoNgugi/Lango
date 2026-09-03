import { useEffect, useState } from 'react'
import {
  collection, query, where, getDocs, orderBy, limit, Timestamp, onSnapshot,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { DoorOpen, Package, AlertTriangle, Users, Home, UserCheck } from 'lucide-react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/LoadingScreen'
import type { Visitor, Delivery, Incident } from '../../types'
import { format } from 'date-fns'

export default function CaretakerDashboard() {
  const { user } = useAuth()
  const propertyId = user?.propertyId ?? ''

  const [loading, setLoading]             = useState(true)
  const [currentVisitors, setCurrentVisitors] = useState<Visitor[]>([])
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([])
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState({
    visitorsToday: 0, currentlyInside: 0, deliveriesToday: 0,
    occupiedUnits: 0, vacantUnits: 0, activeGuards: 0,
  })

  useEffect(() => {
    if (!propertyId) return
    const todayStart = new Date(); todayStart.setHours(0,0,0,0)

    // Real-time current visitors
    const unsub = onSnapshot(
      query(collection(db, 'visitors'), where('propertyId','==',propertyId), where('status','==','INSIDE'), orderBy('checkInTime','desc')),
      snap => {
        setCurrentVisitors(snap.docs.map(d => d.data() as Visitor))
      }
    )

    const loadRest = async () => {
      try {
        const [visSnap, delSnap, incSnap, unitSnap, staffSnap] = await Promise.all([
          getDocs(query(collection(db, 'visitors'),  where('propertyId','==',propertyId), where('checkInTime','>=',Timestamp.fromDate(todayStart)))),
          getDocs(query(collection(db, 'deliveries'),where('propertyId','==',propertyId), where('receivedAt','>=',Timestamp.fromDate(todayStart)))),
          getDocs(query(collection(db, 'incidents'), where('propertyId','==',propertyId), where('status','==','OPEN'), orderBy('createdAt','desc'), limit(5))),
          getDocs(query(collection(db, 'units'),     where('propertyId','==',propertyId))),
          getDocs(query(collection(db, 'users'),     where('propertyId','==',propertyId), where('role','==','SECURITY_GUARD'), where('status','==','ACTIVE'))),
        ])
        const units = unitSnap.docs.map(d => d.data() as any)
        setStats({
          visitorsToday:   visSnap.size,
          currentlyInside: 0, // updated by real-time listener
          deliveriesToday: delSnap.size,
          occupiedUnits:   units.filter((u: any) => u.status === 'OCCUPIED').length,
          vacantUnits:     units.filter((u: any) => u.status === 'VACANT').length,
          activeGuards:    staffSnap.size,
        })
        setRecentDeliveries(delSnap.docs.slice(0,5).map(d => d.data() as Delivery))
        setOpenIncidents(incSnap.docs.map(d => d.data() as Incident))
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    loadRest()
    return unsub
  }, [propertyId])

  if (loading) return <PageLoader />

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{greeting}, {user?.profile?.name?.split(' ')[0] ?? 'Caretaker'} 👋</h1>
        <p className="page-subtitle">Here's your property overview for today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { icon: DoorOpen,    label: 'Visitors Today',    value: stats.visitorsToday,   color: 'text-blue-600',   bg: 'bg-blue-50' },
          { icon: Users,       label: 'Currently Inside',  value: currentVisitors.length, color: 'text-green-600', bg: 'bg-green-50' },
          { icon: Package,     label: 'Deliveries Today',  value: stats.deliveriesToday,  color: 'text-orange-600',bg: 'bg-orange-50' },
          { icon: UserCheck,   label: 'Active Guards',     value: stats.activeGuards,     color: 'text-purple-600',bg: 'bg-purple-50' },
          { icon: Home,        label: 'Occupied Units',    value: stats.occupiedUnits,    color: 'text-gray-900',  bg: 'bg-gray-100' },
          { icon: AlertTriangle,label: 'Open Incidents',  value: openIncidents.length,   color: 'text-red-600',   bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center mb-3`}>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Current visitors */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="section-title mb-0">Currently Inside</h3>
            <span className="badge badge-green">{currentVisitors.length} inside</span>
          </div>
          {currentVisitors.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No visitors inside" description="All clear." />
          ) : (
            <div className="divide-y divide-gray-50">
              {currentVisitors.slice(0,8).map(v => {
                const dur = Math.round((Date.now() - v.checkInTime.toDate().getTime()) / 60000)
                return (
                  <div key={v.visitorId} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{v.visitorName}</p>
                      <p className="text-xs text-gray-500">Unit {v.unitNumber} · {dur}m</p>
                    </div>
                    <span className="badge badge-green text-xs">Inside</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent deliveries */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Deliveries Today</h3>
          </div>
          {recentDeliveries.length === 0 ? (
            <EmptyState icon={Package} title="No deliveries today" />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentDeliveries.map(d => (
                <div key={d.deliveryId} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.company}</p>
                    <p className="text-xs text-gray-500">Unit {d.unitNumber} · {d.tenantName}</p>
                  </div>
                  <span className={`badge ${d.status === 'COLLECTED' ? 'badge-green' : d.status === 'HELD' ? 'badge-yellow' : 'badge-blue'}`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Open incidents */}
      {openIncidents.length > 0 && (
        <div className="card border-l-4 border-l-red-400">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="section-title mb-0 text-red-700">Open Incidents ({openIncidents.length})</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {openIncidents.map(inc => (
              <div key={inc.incidentId} className="flex items-start justify-between px-5 py-3.5 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{inc.type.replace(/_/g,' ')}</p>
                  <p className="text-xs text-gray-500 truncate">{inc.description}</p>
                  <p className="text-xs text-gray-400">{format(inc.createdAt.toDate(), 'h:mm a')}</p>
                </div>
                <span className={`badge flex-shrink-0 ${
                  inc.severity === 'CRITICAL' ? 'badge-red' : inc.severity === 'HIGH' ? 'badge-orange' : 'badge-yellow'
                }`}>{inc.severity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
