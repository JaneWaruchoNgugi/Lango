import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, where, getDocs, orderBy,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import {
  ArrowLeft, Building2, MapPin, Pencil,
  Home, Users, DoorOpen, AlertTriangle, BarChart3, CreditCard,
} from 'lucide-react'
import { PropertyStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Property, Block, Unit, Visitor, AppUser, Incident } from '../../types'
import { format } from 'date-fns'
import { SUBSCRIPTION_PLANS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { GenerateUnitsForm } from '../../components/units/GenerateUnitsForm'
import { ManualUnitForm } from '../../components/units/ManualUnitForm'
import { unitDisplayName, unitFloorLabel } from '../../domain/unitHelpers'

type TabId = 'overview' | 'blocks' | 'units' | 'staff' | 'visitors' | 'deliveries' | 'incidents' | 'subscription'

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3 },
  { id: 'blocks',       label: 'Blocks',       icon: Building2 },
  { id: 'units',        label: 'Units',        icon: Home },
  { id: 'staff',        label: 'Staff',        icon: Users },
  { id: 'visitors',     label: 'Visitors',     icon: DoorOpen },
  { id: 'incidents',    label: 'Incidents',    icon: AlertTriangle },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
]

export default function PropertyDetailPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const actor     = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Admin', role: user?.role ?? 'SUPER_ADMIN' as const }
  const [tab, setTab]           = useState<TabId>('overview')
  const [property, setProperty] = useState<Property | null>(null)
  const [blocks, setBlocks]     = useState<Block[]>([])
  const [units, setUnits]       = useState<Unit[]>([])
  const [staff, setStaff]       = useState<AppUser[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading]   = useState(true)
  const [addMode, setAddMode]   = useState<'generate' | 'manual' | null>(null)
  const [addBlockId, setAddBlockId] = useState<string>('')

  const reload = useCallback(async () => {
    if (!id) return
    try {
      const [propSnap, blockSnap, unitSnap, staffSnap, visSnap, incSnap] = await Promise.all([
        getDoc(doc(db, 'properties', id)),
        getDocs(query(collection(db, 'blocks'),   where('propertyId', '==', id), orderBy('name'))),
        getDocs(query(collection(db, 'units'),    where('propertyId', '==', id), orderBy('unitNumber'))),
        getDocs(query(collection(db, 'users'),    where('propertyId', '==', id))),
        getDocs(query(collection(db, 'visitors'), where('propertyId', '==', id), orderBy('checkInTime', 'desc'), )),
        getDocs(query(collection(db, 'incidents'),where('propertyId', '==', id), orderBy('createdAt', 'desc'))),
      ])
      setProperty(propSnap.exists() ? propSnap.data() as Property : null)
      setBlocks(blockSnap.docs.map(d => d.data() as Block))
      setUnits(unitSnap.docs.map(d => d.data() as Unit))
      setStaff(staffSnap.docs.map(d => d.data() as AppUser))
      setVisitors(visSnap.docs.map(d => d.data() as Visitor))
      setIncidents(incSnap.docs.map(d => d.data() as Incident))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  if (loading) return <PageLoader />
  if (!property) return (
    <div className="text-center py-20">
      <p className="text-gray-500">Property not found.</p>
      <Link to="/admin/properties" className="text-lango-primary text-sm hover:underline mt-2 block">Back to properties</Link>
    </div>
  )

  const occupiedUnits  = units.filter(u => u.status === 'OCCUPIED').length
  const vacantUnits    = units.filter(u => u.status === 'VACANT').length
  const currentVisitors = visitors.filter(v => v.status === 'INSIDE').length
  const plan           = SUBSCRIPTION_PLANS[property.plan]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="page-title">{property.name}</h1>
                <PropertyStatusBadge status={property.status} />
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>{property.address}, {property.city}</span>
              </div>
            </div>
            <Link to={`/admin/properties/${id}/edit`} className="btn-secondary">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Units',    value: units.length,    color: 'text-gray-900' },
          { label: 'Occupied',       value: occupiedUnits,   color: 'text-green-600' },
          { label: 'Vacant',         value: vacantUnits,     color: 'text-gray-500' },
          { label: 'Inside Now',     value: currentVisitors, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 min-w-max">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-lango-primary text-lango-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="card p-5">
            <h3 className="section-title">Property Details</h3>
            <dl className="space-y-2.5">
              <Row label="Type"     value={property.type.replace(/_/g, ' ')} />
              <Row label="Blocks"   value={`${blocks.length} block${blocks.length !== 1 ? 's' : ''}`} />
              <Row label="Plan"     value={plan.name} />
              <Row label="County"   value={property.county} />
              <Row label="City"     value={property.city} />
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="section-title">Contact Information</h3>
            <dl className="space-y-2.5">
              <Row label="Contact"  value={property.primaryContact} />
              <Row label="Phone"    value={property.phone} />
              <Row label="Email"    value={property.email} />
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="section-title">Staff</h3>
            <dl className="space-y-2.5">
              <Row label="Guards"     value={staff.filter(s => s.role === 'SECURITY_GUARD').length.toString()} />
              <Row label="Caretakers" value={staff.filter(s => s.role === 'CARETAKER').length.toString()} />
              <Row label="Managers"   value={staff.filter(s => s.role === 'PROPERTY_MANAGER').length.toString()} />
            </dl>
          </div>
          <div className="card p-5">
            <h3 className="section-title">Today's Activity</h3>
            <dl className="space-y-2.5">
              <Row label="Total Visitors"   value={visitors.length.toString()} />
              <Row label="Currently Inside" value={currentVisitors.toString()} />
              <Row label="Open Incidents"   value={incidents.filter(i => i.status === 'OPEN').length.toString()} />
            </dl>
          </div>
        </div>
      )}

      {tab === 'blocks' && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Blocks ({blocks.length})</h3>
            <Link to={`/admin/properties/${id}/blocks/new`} className="btn-primary text-xs">
              + Add Block
            </Link>
          </div>
          {blocks.length === 0 ? (
            <EmptyState icon={Building2} title="No blocks yet" description="Add blocks to this property." />
          ) : (
            <div className="divide-y divide-gray-50">
              {blocks.map(b => {
                const blockUnits = units.filter(u => u.blockId === b.blockId)
                const occ = blockUnits.filter(u => u.status === 'OCCUPIED').length
                return (
                  <div key={b.blockId} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{b.name}</p>
                      <p className="text-xs text-gray-500">{blockUnits.length} units · {occ} occupied</p>
                    </div>
                    <span className={`badge ${b.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{b.status}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'units' && (
        <>
          <div className="card p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title mb-0">Add Units</h3>
              <div className="flex gap-2">
                <button className={`btn-primary text-xs ${addMode === 'generate' ? '' : 'opacity-70'}`} onClick={() => setAddMode(addMode === 'generate' ? null : 'generate')}>Generate</button>
                <button className={`btn-primary text-xs ${addMode === 'manual' ? '' : 'opacity-70'}`} onClick={() => setAddMode(addMode === 'manual' ? null : 'manual')}>Enter Manually</button>
              </div>
            </div>
            {blocks.length > 0 && addMode && (
              <div className="mb-3">
                <label className="label">Block (optional)</label>
                <select className="input" value={addBlockId} onChange={(e) => setAddBlockId(e.target.value)}>
                  <option value="">No block</option>
                  {blocks.map(b => <option key={b.blockId} value={b.blockId}>{b.name}</option>)}
                </select>
              </div>
            )}
            {addMode === 'generate' && (
              <GenerateUnitsForm propertyId={id!} actor={actor}
                blockId={addBlockId || null}
                blockName={blocks.find(b => b.blockId === addBlockId)?.name ?? null}
                onCreated={() => { reload(); setAddMode(null) }} />
            )}
            {addMode === 'manual' && (
              <ManualUnitForm propertyId={id!} actor={actor}
                blockId={addBlockId || null}
                blockName={blocks.find(b => b.blockId === addBlockId)?.name ?? null}
                onCreated={() => { reload() }} />
            )}
          </div>
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="section-title mb-0">Units ({units.length})</h3>
            </div>
            {units.length === 0 ? (
              <EmptyState icon={Home} title="No units yet" description="Use Add Units above to generate or enter units." />
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Unit</th><th>Floor</th><th>Type</th><th>Block</th><th>Status</th><th>Tenant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map(u => (
                      <tr key={u.unitId}>
                        <td className="font-medium">{unitDisplayName(u)}</td>
                        <td>{unitFloorLabel(u) || '—'}</td>
                        <td>{u.unitType ?? '—'}</td>
                        <td>{u.blockName ?? '—'}</td>
                        <td>
                          <span className={`badge ${
                            u.status === 'OCCUPIED'    ? 'badge-green' :
                            u.status === 'RESERVED'    ? 'badge-blue'  :
                            u.status === 'MAINTENANCE' ? 'badge-yellow': 'badge-gray'
                          }`}>{u.status}</span>
                        </td>
                        <td className="text-gray-500">{u.currentTenantName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'staff' && (
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Staff ({staff.length})</h3>
            <Link to={`/admin/staff/new?propertyId=${id}`} className="btn-primary text-xs">+ Add Staff</Link>
          </div>
          {staff.length === 0 ? (
            <EmptyState icon={Users} title="No staff assigned" description="Add a caretaker or guard to this property." />
          ) : (
            <div className="divide-y divide-gray-50">
              {staff.map(s => (
                <div key={s.uid} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500">{s.email} · {s.phone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-blue">{s.role.replace(/_/g,' ')}</span>
                    <span className={`badge ${s.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'visitors' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Visitors ({visitors.length})</h3>
          </div>
          {visitors.length === 0 ? (
            <EmptyState icon={DoorOpen} title="No visitors recorded" description="Visitors registered at the gate will appear here." />
          ) : (
            <div className="table-container">
              <table className="table">
                <thead><tr><th>Name</th><th>Unit</th><th>Type</th><th>Status</th><th>Check-in</th></tr></thead>
                <tbody>
                  {visitors.slice(0, 50).map(v => (
                    <tr key={v.visitorId}>
                      <td className="font-medium">{v.visitorName}</td>
                      <td>{v.unitNumber}</td>
                      <td><span className="badge badge-blue">{v.visitType}</span></td>
                      <td><span className={`badge ${v.status === 'INSIDE' ? 'badge-green' : 'badge-gray'}`}>{v.status}</span></td>
                      <td className="text-gray-500 text-xs">{format(v.checkInTime.toDate(), 'dd MMM, h:mm a')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'incidents' && (
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-50">
            <h3 className="section-title mb-0">Incidents ({incidents.length})</h3>
          </div>
          {incidents.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No incidents reported" description="All clear — no incidents on record." />
          ) : (
            <div className="divide-y divide-gray-50">
              {incidents.map(inc => (
                <div key={inc.incidentId} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{inc.type.replace(/_/g,' ')}</p>
                    <p className="text-xs text-gray-500 truncate">{inc.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(inc.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}</p>
                  </div>
                  <span className={`badge flex-shrink-0 ${
                    inc.severity === 'CRITICAL' ? 'badge-red' :
                    inc.severity === 'HIGH'     ? 'badge-orange' :
                    inc.severity === 'MEDIUM'   ? 'badge-yellow' : 'badge-green'
                  }`}>{inc.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'subscription' && (
        <div className="card p-6">
          <h3 className="section-title">Subscription Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-lango-light rounded-xl">
              <p className="text-xs text-gray-500 mb-0.5">Current Plan</p>
              <p className="text-xl font-bold text-lango-primary">{plan.name}</p>
              <p className="text-sm text-gray-600 mt-1">KES {plan.monthlyPrice.toLocaleString()} / month</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Plan Features</p>
              <ul className="space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-gray-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lango-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="btn-primary text-sm">Upgrade Plan</button>
            <button className="btn-secondary text-sm">View Invoice History</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-xs text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-xs font-medium text-gray-800 text-right">{value}</dd>
    </div>
  )
}
