import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2, Users, Home, UserCheck, DoorOpen, Package,
  AlertTriangle, TrendingUp, Plus, ArrowRight,
} from 'lucide-react'
import {
  collection, query, where, getDocs, orderBy, limit,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PropertyStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Property, Visitor, Incident } from '../../types'
import { format } from 'date-fns'

interface Stats {
  totalProperties: number
  activeProperties: number
  trialProperties: number
  suspendedProperties: number
  totalUnits: number
  occupiedUnits: number
  visitorsToday: number
  activeStaff: number
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentProperties, setRecentProperties] = useState<Property[]>([])
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([])
  const [recentVisitors, setRecentVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        // Properties
        const propSnap = await getDocs(collection(db, 'properties'))
        const props = propSnap.docs.map(d => d.data() as Property)

        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)

        // Visitors today
        const visSnap = await getDocs(
          query(collection(db, 'visitors'),
            where('checkInTime', '>=', todayStart),
            orderBy('checkInTime', 'desc'),
            limit(5)
          )
        )
        const visitors = visSnap.docs.map(d => d.data() as Visitor)

        // Units
        const unitSnap = await getDocs(collection(db, 'units'))
        const units = unitSnap.docs.map(d => d.data() as any)
        const occupiedUnits = units.filter((u: any) => u.status === 'OCCUPIED').length

        // Active staff
        const staffSnap = await getDocs(
          query(collection(db, 'users'), where('status', '==', 'ACTIVE'))
        )

        // Recent incidents
        const incSnap = await getDocs(
          query(collection(db, 'incidents'), orderBy('createdAt', 'desc'), limit(5))
        )
        const incidents = incSnap.docs.map(d => d.data() as Incident)

        // Recent properties
        const recentPropSnap = await getDocs(
          query(collection(db, 'properties'), orderBy('createdAt', 'desc'), limit(5))
        )
        const recentProps = recentPropSnap.docs.map(d => d.data() as Property)

        setStats({
          totalProperties:    props.length,
          activeProperties:   props.filter(p => p.status === 'ACTIVE').length,
          trialProperties:    props.filter(p => p.status === 'TRIAL').length,
          suspendedProperties:props.filter(p => p.status === 'SUSPENDED').length,
          totalUnits:         units.length,
          occupiedUnits,
          visitorsToday:      visitors.length,
          activeStaff:        staffSnap.size,
        })
        setRecentVisitors(visitors)
        setRecentProperties(recentProps)
        setRecentIncidents(incidents)
      } catch (err) {
        console.error('Dashboard load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <PageLoader />

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">{greeting}, {user?.profile?.name?.split(' ')[0] ?? 'Admin'} 👋</h1>
          <p className="page-subtitle">Here's what's happening across your properties today.</p>
        </div>
        <Link to="/admin/properties/new" className="btn-primary hidden sm:flex">
          <Plus className="w-4 h-4" />
          Add Property
        </Link>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Building2}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            label="Total Properties"
            value={stats.totalProperties}
            sub={`${stats.activeProperties} active`}
          />
          <StatCard
            icon={Home}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            label="Total Units"
            value={stats.totalUnits}
            sub={`${stats.occupiedUnits} occupied`}
          />
          <StatCard
            icon={DoorOpen}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
            label="Visitors Today"
            value={stats.visitorsToday}
            sub="across all properties"
          />
          <StatCard
            icon={Users}
            iconBg="bg-orange-50"
            iconColor="text-orange-600"
            label="Active Staff"
            value={stats.activeStaff}
            sub="guards & caretakers"
          />
        </div>
      )}

      {/* Property status breakdown */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.activeProperties}</p>
            <p className="text-xs text-gray-500 mt-0.5">Active</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.trialProperties}</p>
            <p className="text-xs text-gray-500 mt-0.5">Trial</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.suspendedProperties}</p>
            <p className="text-xs text-gray-500 mt-0.5">Suspended</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Properties */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Recent Properties</h3>
            <Link to="/admin/properties" className="text-xs text-lango-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentProperties.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No properties yet"
              description="Add your first property to get started."
              action={
                <Link to="/admin/properties/new" className="btn-primary text-xs">
                  <Plus className="w-3 h-3" /> Add Property
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentProperties.map(prop => (
                <Link
                  key={prop.propertyId}
                  to={`/admin/properties/${prop.propertyId}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-lango-light rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-lango-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{prop.name}</p>
                      <p className="text-xs text-gray-500 truncate">{prop.city}, {prop.county}</p>
                    </div>
                  </div>
                  <PropertyStatusBadge status={prop.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Visitors Today</h3>
            <span className="text-xs text-gray-400">All properties</span>
          </div>
          {recentVisitors.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No visitors today" description="Visitors will appear here when registered." />
          ) : (
            <div className="divide-y divide-gray-50">
              {recentVisitors.map(v => (
                <div key={v.visitorId} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.visitorName}</p>
                    <p className="text-xs text-gray-500">
                      Unit {v.unitNumber} · {format(v.checkInTime.toDate(), 'h:mm a')}
                    </p>
                  </div>
                  <span className={`badge ${v.status === 'INSIDE' ? 'badge-green' : 'badge-gray'}`}>
                    {v.status === 'INSIDE' ? 'Inside' : 'Checked Out'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Incidents */}
      {recentIncidents.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <h3 className="section-title mb-0">Recent Incidents</h3>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {recentIncidents.map(inc => (
              <div key={inc.incidentId} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{inc.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 truncate">{inc.description}</p>
                </div>
                <span className={`badge ${
                  inc.severity === 'CRITICAL' ? 'badge-red' :
                  inc.severity === 'HIGH'     ? 'badge-orange' :
                  inc.severity === 'MEDIUM'   ? 'badge-yellow' : 'badge-green'
                }`}>
                  {inc.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon, iconBg, iconColor, label, value, sub,
}: {
  icon: typeof Building2; iconBg: string; iconColor: string
  label: string; value: number; sub?: string
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconBg} flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}
