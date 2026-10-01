import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc, serverTimestamp, setDoc, Timestamp, deleteDoc,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { db, functions } from '../../firebase/config'
import {
  ArrowLeft, Building2, MapPin, Pencil,
  Home, Users, DoorOpen, AlertTriangle, BarChart3, CreditCard, Trash2, UserX, UserCheck,
} from 'lucide-react'
import { PropertyStatusBadge } from '../../components/ui/StatusBadge'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { EmptyState } from '../../components/ui/EmptyState'
import type { Property, Block, Unit, Visitor, AppUser, Incident, Subscription, SubscriptionPlan } from '../../types'
import { format } from 'date-fns'
import { SUBSCRIPTION_PLANS } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { GenerateUnitsForm } from '../../components/units/GenerateUnitsForm'
import { ManualUnitForm } from '../../components/units/ManualUnitForm'
import { DeleteBlockDialog } from '../../components/units/DeleteBlockDialog'
import { unitDisplayName, unitFloorLabel } from '../../domain/unitHelpers'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'
import { deleteUnit } from '../../services/unitService'
import toast from 'react-hot-toast'

const staffEditSchema = z.object({
  name:  z.string().min(2, 'Name required'),
  phone: z.string().min(9, 'Valid phone required'),
  role:  z.enum(['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD']),
})
type StaffEditForm = z.infer<typeof staffEditSchema>

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
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null)
  const [unitToDelete, setUnitToDelete]   = useState<Unit | null>(null)
  const [deletingUnit, setDeletingUnit]   = useState(false)
  // Subscription / upgrade plan
  const [showUpgradePlan, setShowUpgradePlan]   = useState(false)
  const [selectedPlan, setSelectedPlan]         = useState<SubscriptionPlan>('SMALL')
  const [upgradingPlan, setUpgradingPlan]       = useState(false)
  const [showInvoices, setShowInvoices]         = useState(false)
  const [subscriptions, setSubscriptions]       = useState<Subscription[]>([])
  const [loadingInvoices, setLoadingInvoices]   = useState(false)
  // Delete property
  const [showDeleteProperty, setShowDeleteProperty] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName]   = useState('')
  const [deletingProperty, setDeletingProperty]     = useState(false)
  // Staff actions (B1)
  const [staffToEdit, setStaffToEdit]     = useState<AppUser | null>(null)
  const [staffEditing, setStaffEditing]   = useState(false)
  const [staffToToggle, setStaffToToggle] = useState<AppUser | null>(null)
  const [staffToggling, setStaffToggling] = useState(false)
  // Renewal date for upgrade-plan modal (B2)
  const [renewalDate, setRenewalDate]     = useState('')

  const staffEditForm = useForm<StaffEditForm>({ resolver: zodResolver(staffEditSchema) })

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
      const parseFloor = (f?: string | null) => { const n = parseInt(f ?? '', 10); return isNaN(n) ? 0 : n }
      const rawUnits = unitSnap.docs.map(d => d.data() as Unit)
      rawUnits.sort((a, b) => {
        const fd = parseFloor(a.floor) - parseFloor(b.floor)
        return fd !== 0 ? fd : a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: 'base' })
      })
      setUnits(rawUnits)
      setStaff(staffSnap.docs.map(d => d.data() as AppUser))
      setVisitors(visSnap.docs.map(d => d.data() as Visitor))
      setIncidents(incSnap.docs.map(d => d.data() as Incident))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [id])

  const onUpgradePlan = async () => {
    if (!property || selectedPlan === property.plan) { setShowUpgradePlan(false); return }
    setUpgradingPlan(true)
    try {
      const now      = Timestamp.now()
      const nextDate = renewalDate
        ? new Date(renewalDate)
        : new Date(now.toDate().getFullYear(), now.toDate().getMonth() + 1, now.toDate().getDate())
      const renewal  = Timestamp.fromDate(nextDate)
      const planInfo = SUBSCRIPTION_PLANS[selectedPlan]

      await updateDoc(doc(db, 'properties', id!), { plan: selectedPlan, updatedAt: serverTimestamp() })

      const subRef = doc(collection(db, 'subscriptions'))
      await setDoc(subRef, {
        subscriptionId: subRef.id,
        propertyId:    id!,
        planId:        selectedPlan,
        price:         planInfo.monthlyPrice,
        billingCycle:  'MONTHLY',
        startDate:     now,
        renewalDate:   renewal,
        status:        'ACTIVE',
        createdAt:     serverTimestamp(),
      })

      setProperty(prev => prev ? { ...prev, plan: selectedPlan } : null)
      toast.success('Plan updated')
      setShowUpgradePlan(false)
      setRenewalDate('')
    } catch {
      toast.error('Failed to update plan')
    } finally {
      setUpgradingPlan(false)
    }
  }

  const loadInvoices = async () => {
    setLoadingInvoices(true)
    setShowInvoices(true)
    try {
      const snap = await getDocs(query(
        collection(db, 'subscriptions'),
        where('propertyId', '==', id),
        orderBy('createdAt', 'desc'),
      ))
      setSubscriptions(snap.docs.map(d => d.data() as Subscription))
    } catch {
      toast.error('Failed to load invoice history')
    } finally {
      setLoadingInvoices(false)
    }
  }

  const onDeleteProperty = async () => {
    if (!property || deleteConfirmName !== property.name) return
    setDeletingProperty(true)
    try {
      const fn = httpsCallable<{ propertyId: string }, { ok: boolean }>(functions, 'deleteProperty')
      await fn({ propertyId: id! })
      toast.success('Property deleted')
      navigate('/admin/properties')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete property')
      setDeletingProperty(false)
    }
  }

  // B1: Edit staff member scoped to this property
  const onStaffEdit = async (data: StaffEditForm) => {
    if (!staffToEdit) return
    setStaffEditing(true)
    try {
      if (data.role !== staffToEdit.role) {
        const claimsFn = httpsCallable<{ uid: string; role: string; propertyId: string }, { ok: boolean }>(functions, 'setUserClaims')
        await claimsFn({ uid: staffToEdit.uid, role: data.role, propertyId: id! })
      }
      await updateDoc(doc(db, 'users', staffToEdit.uid), {
        name: data.name, phone: data.phone, role: data.role, updatedAt: serverTimestamp(),
      })
      setStaff(prev => prev.map(s => s.uid === staffToEdit.uid
        ? { ...s, name: data.name, phone: data.phone, role: data.role } : s))
      toast.success(`${data.name} updated`)
      setStaffToEdit(null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update')
    } finally {
      setStaffEditing(false)
    }
  }

  // B1: Toggle staff active/inactive
  const onToggleStaff = async () => {
    if (!staffToToggle) return
    setStaffToggling(true)
    const newStatus = staffToToggle.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateDoc(doc(db, 'users', staffToToggle.uid), { status: newStatus, updatedAt: serverTimestamp() })
      setStaff(prev => prev.map(s => s.uid === staffToToggle.uid ? { ...s, status: newStatus } : s))
      toast.success(`${staffToToggle.name} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
      setStaffToToggle(null)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setStaffToggling(false)
    }
  }

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
            <div className="flex items-center gap-2">
              <Link to={`/admin/properties/${id}/edit`} className="btn-secondary">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Link>
              <button
                onClick={() => { setDeleteConfirmName(''); setShowDeleteProperty(true) }}
                className="btn-danger text-sm"
                title="Delete property"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
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
                    <div className="flex items-center gap-3">
                      <span className={`badge ${b.status === 'ACTIVE' ? 'badge-green' : 'badge-gray'}`}>{b.status}</span>
                      <button
                        onClick={() => setBlockToDelete(b)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete block"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
                      <th>Unit</th><th>Floor</th><th>Type</th><th>Block</th><th>Status</th><th>Tenant</th><th>Actions</th>
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
                        <td>
                          {u.status === 'OCCUPIED' ? (
                            <button className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed" title="Move the tenant out first" disabled>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setUnitToDelete(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Delete unit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
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
                    <button
                      onClick={() => {
                        staffEditForm.reset({ name: s.name, phone: s.phone ?? '', role: s.role as StaffEditForm['role'] })
                        setStaffToEdit(s)
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-lango-primary hover:bg-lango-light transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setStaffToToggle(s)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        s.status === 'ACTIVE'
                          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                      title={s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    >
                      {s.status === 'ACTIVE' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
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
                <thead><tr><th>Name</th><th>Unit</th><th>Type</th><th>Status</th><th>Check-in</th><th></th></tr></thead>
                <tbody>
                  {visitors.slice(0, 50).map(v => (
                    <tr key={v.visitorId} className="group">
                      <td className="font-medium">{v.visitorName}</td>
                      <td>{v.unitNumber}</td>
                      <td><span className="badge badge-blue">{v.visitType}</span></td>
                      <td><span className={`badge ${v.status === 'INSIDE' ? 'badge-green' : 'badge-gray'}`}>{v.status}</span></td>
                      <td className="text-gray-500 text-xs">{format(v.checkInTime.toDate(), 'dd MMM, h:mm a')}</td>
                      <td>
                        <button
                          onClick={async () => {
                            await deleteDoc(doc(db, 'visitors', v.visitorId))
                            setVisitors(prev => prev.filter(x => x.visitorId !== v.visitorId))
                          }}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete visitor record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
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
                <div key={inc.incidentId} className="px-5 py-3.5 flex items-start justify-between gap-4 group">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900">{inc.type.replace(/_/g,' ')}</p>
                      {inc.status === 'RESOLVED' || inc.status === 'CLOSED' ? (
                        <span className="badge badge-green flex-shrink-0">{inc.status}</span>
                      ) : (
                        <>
                          <span className={`badge flex-shrink-0 ${
                            inc.severity === 'CRITICAL' ? 'badge-red' :
                            inc.severity === 'HIGH'     ? 'badge-orange' :
                            inc.severity === 'MEDIUM'   ? 'badge-yellow' : 'badge-green'
                          }`}>{inc.severity}</span>
                          {inc.status === 'INVESTIGATING' && (
                            <span className="badge badge-blue flex-shrink-0">INVESTIGATING</span>
                          )}
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{inc.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{format(inc.createdAt.toDate(), 'dd MMM yyyy, h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {inc.status !== 'RESOLVED' && inc.status !== 'CLOSED' && (
                      <button
                        onClick={async () => {
                          await updateDoc(doc(db, 'incidents', inc.incidentId), {
                            status: 'RESOLVED', resolvedBy: actor.name, resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
                          })
                          setIncidents(prev => prev.map(i => i.incidentId === inc.incidentId ? { ...i, status: 'RESOLVED' } : i))
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                        title="Mark as resolved"
                      >
                        Resolve
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        await deleteDoc(doc(db, 'incidents', inc.incidentId))
                        setIncidents(prev => prev.filter(i => i.incidentId !== inc.incidentId))
                      }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete incident"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <DeleteBlockDialog
        block={blockToDelete}
        units={units}
        actor={actor}
        onClose={() => setBlockToDelete(null)}
        onDeleted={() => { setBlockToDelete(null); reload() }}
      />
      <ConfirmDialog
        isOpen={!!unitToDelete}
        onClose={() => setUnitToDelete(null)}
        onConfirm={async () => {
          if (!unitToDelete) return
          setDeletingUnit(true)
          try {
            await deleteUnit(unitToDelete, actor)
            toast.success('Unit deleted')
            setUnitToDelete(null)
            reload()
          } catch (e) {
            toast.error(e instanceof Error ? e.message : 'Failed to delete unit')
          } finally {
            setDeletingUnit(false)
          }
        }}
        title="Delete unit"
        message={unitToDelete ? `Delete unit ${unitDisplayName(unitToDelete)}? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        loading={deletingUnit}
      />

      {/* Upgrade Plan Modal */}
      <Modal
        isOpen={showUpgradePlan}
        onClose={() => setShowUpgradePlan(false)}
        title="Change subscription plan"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowUpgradePlan(false)} disabled={upgradingPlan}>Cancel</button>
            <button className="btn-primary" onClick={onUpgradePlan} disabled={upgradingPlan}>
              {upgradingPlan && <Spinner size="sm" className="text-white" />}
              Save
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Current plan: <span className="font-medium text-gray-800">{SUBSCRIPTION_PLANS[property.plan].name}</span></p>
          <div>
            <label className="label">New plan</label>
            <select className="input" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value as SubscriptionPlan)}>
              {(Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlan[]).map(p => (
                <option key={p} value={p}>
                  {SUBSCRIPTION_PLANS[p].name} — KES {SUBSCRIPTION_PLANS[p].monthlyPrice.toLocaleString()}/mo
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Renewal date <span className="text-gray-400 font-normal">(optional — defaults to +1 month)</span></label>
            <input
              type="date"
              className="input"
              value={renewalDate}
              onChange={e => setRenewalDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            {SUBSCRIPTION_PLANS[selectedPlan].features.map(f => (
              <p key={f} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lango-primary flex-shrink-0" />{f}
              </p>
            ))}
          </div>
        </div>
      </Modal>

      {/* Invoice History Modal */}
      <Modal
        isOpen={showInvoices}
        onClose={() => setShowInvoices(false)}
        title="Invoice history"
        size="md"
      >
        {loadingInvoices ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : subscriptions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">No subscription records found for this property.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {subscriptions.map(sub => (
              <div key={sub.subscriptionId} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{SUBSCRIPTION_PLANS[sub.planId]?.name ?? sub.planId}</p>
                  <p className="text-xs text-gray-500">{sub.billingCycle} · KES {sub.price.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(sub.startDate.toDate(), 'dd MMM yyyy')} → {format(sub.renewalDate.toDate(), 'dd MMM yyyy')}
                  </p>
                </div>
                <span className={`badge flex-shrink-0 ${
                  sub.status === 'ACTIVE' ? 'badge-green' :
                  sub.status === 'PAST_DUE' ? 'badge-yellow' :
                  sub.status === 'SUSPENDED' ? 'badge-red' : 'badge-gray'
                }`}>{sub.status}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Delete Property Modal */}
      <Modal
        isOpen={showDeleteProperty}
        onClose={() => setShowDeleteProperty(false)}
        title="Delete property"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowDeleteProperty(false)} disabled={deletingProperty}>Cancel</button>
            <button
              className="btn-danger"
              disabled={deleteConfirmName !== property.name || deletingProperty}
              onClick={onDeleteProperty}
            >
              {deletingProperty && <Spinner size="sm" className="text-white" />}
              Delete permanently
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This will permanently delete <span className="font-medium">{property.name}</span> and all related data — blocks, units, staff, visitors, and history. This cannot be undone.
          </p>
          <div>
            <label className="label">
              Type <span className="font-mono text-red-600">{property.name}</span> to confirm
            </label>
            <input
              className="input"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={property.name}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Staff Modal (B1) */}
      <Modal
        isOpen={!!staffToEdit}
        onClose={() => setStaffToEdit(null)}
        title="Edit staff member"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setStaffToEdit(null)} disabled={staffEditing}>Cancel</button>
            <button className="btn-primary" form="staffEditForm" type="submit" disabled={staffEditing}>
              {staffEditing && <Spinner size="sm" className="text-white" />}
              Save
            </button>
          </>
        }
      >
        <form id="staffEditForm" onSubmit={staffEditForm.handleSubmit(onStaffEdit)} className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" {...staffEditForm.register('name')} />
            {staffEditForm.formState.errors.name && <p className="error-text">{staffEditForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" {...staffEditForm.register('phone')} />
            {staffEditForm.formState.errors.phone && <p className="error-text">{staffEditForm.formState.errors.phone.message}</p>}
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" {...staffEditForm.register('role')}>
              <option value="PROPERTY_MANAGER">Property Manager</option>
              <option value="CARETAKER">Caretaker</option>
              <option value="SECURITY_GUARD">Security Guard</option>
            </select>
            {staffEditForm.formState.errors.role && <p className="error-text">{staffEditForm.formState.errors.role.message}</p>}
          </div>
        </form>
      </Modal>

      {/* Toggle Staff ConfirmDialog (B1) */}
      <ConfirmDialog
        isOpen={!!staffToToggle}
        onClose={() => setStaffToToggle(null)}
        onConfirm={onToggleStaff}
        title={staffToToggle?.status === 'ACTIVE' ? 'Deactivate staff' : 'Activate staff'}
        message={staffToToggle
          ? `${staffToToggle.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${staffToToggle.name}?`
          : ''}
        confirmLabel={staffToToggle?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        variant={staffToToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
        loading={staffToggling}
      />

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
            <button className="btn-primary text-sm" onClick={() => { setSelectedPlan(property.plan); setShowUpgradePlan(true) }}>
              Upgrade Plan
            </button>
            <button className="btn-secondary text-sm" onClick={loadInvoices}>
              View Invoice History
            </button>
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
