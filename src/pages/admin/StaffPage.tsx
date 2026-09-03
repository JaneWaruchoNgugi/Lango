import { useState, useEffect } from 'react'
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { Users, Search, Plus, UserCheck, Shield, Home } from 'lucide-react'
import { StaffStatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AppUser, Property, UserRole } from '../../types'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import toast from 'react-hot-toast'
import { Spinner } from '../../components/ui/LoadingScreen'

const staffSchema = z.object({
  name:       z.string().min(2, 'Name is required'),
  email:      z.string().email('Valid email required'),
  phone:      z.string().min(9, 'Valid phone required'),
  role:       z.enum(['PROPERTY_MANAGER', 'CARETAKER', 'SECURITY_GUARD']),
  propertyId: z.string().min(1, 'Assign a property'),
  status:     z.enum(['ACTIVE', 'INACTIVE']),
})
type StaffForm = z.infer<typeof staffSchema>

export default function StaffPage() {
  const [staff, setStaff]         = useState<AppUser[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL')
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating]   = useState(false)
  const [tempCred, setTempCred] = useState<{ name: string; email: string; password: string } | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'SECURITY_GUARD', status: 'ACTIVE' },
  })

  useEffect(() => {
    Promise.all([
      getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))),
      getDocs(query(collection(db, 'properties'), orderBy('name'))),
    ]).then(([staffSnap, propSnap]) => {
      setStaff(staffSnap.docs.map(d => d.data() as AppUser).filter(u => u.role !== 'SUPER_ADMIN'))
      setProperties(propSnap.docs.map(d => d.data() as Property))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const filtered = staff.filter(s => {
    const matchSearch = s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter
    return matchSearch && matchRole
  })

  const onCreateStaff = async (data: StaffForm) => {
    setCreating(true)
    try {
      const createStaffUser = httpsCallable<StaffForm, { uid: string; tempPassword: string }>(functions, 'createStaffUser')
      const res = await createStaffUser(data)
      setTempCred({ name: data.name, email: data.email, password: res.data.tempPassword })
      toast.success(`Account created for ${data.name}`)
      setShowModal(false)
      reset()
      const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))
      setStaff(snap.docs.map(d => d.data() as AppUser).filter(u => u.role !== 'SUPER_ADMIN'))
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Failed to create staff account')
    } finally {
      setCreating(false)
    }
  }

  const toggleStatus = async (member: AppUser) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await updateDoc(doc(db, 'users', member.uid), { status: newStatus, updatedAt: serverTimestamp() })
      setStaff(prev => prev.map(s => s.uid === member.uid ? { ...s, status: newStatus } : s))
      toast.success(`${member.name} ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const roleIcon = (role: UserRole) => {
    if (role === 'SECURITY_GUARD')   return <Shield className="w-3.5 h-3.5 text-blue-500" />
    if (role === 'CARETAKER')        return <Home className="w-3.5 h-3.5 text-green-500" />
    if (role === 'PROPERTY_MANAGER') return <UserCheck className="w-3.5 h-3.5 text-purple-500" />
    return null
  }

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="page-subtitle">{staff.length} staff members across all properties</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Staff</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            placeholder="Search staff..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | 'ALL')} className="input sm:w-48">
          <option value="ALL">All Roles</option>
          <option value="PROPERTY_MANAGER">Property Manager</option>
          <option value="CARETAKER">Caretaker</option>
          <option value="SECURITY_GUARD">Security Guard</option>
        </select>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={Users} title="No staff found" description="Add staff accounts here. Only Super Admin can create accounts." />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th className="hidden sm:table-cell">Property</th>
                  <th className="hidden md:table-cell">Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(member => {
                  const prop = properties.find(p => p.propertyId === member.propertyId)
                  return (
                    <tr key={member.uid}>
                      <td>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5">
                          {roleIcon(member.role)}
                          <span className="text-xs text-gray-700">{member.role.replace(/_/g, ' ')}</span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-xs text-gray-600">{prop?.name ?? '—'}</td>
                      <td className="hidden md:table-cell text-xs text-gray-600">{member.phone ?? '—'}</td>
                      <td><StaffStatusBadge status={member.status} /></td>
                      <td>
                        <button
                          onClick={() => toggleStatus(member)}
                          className="text-xs text-lango-primary hover:underline"
                        >
                          {member.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Staff Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); reset() }}
        title="Add Staff Member"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowModal(false); reset() }} className="btn-secondary" disabled={creating}>Cancel</button>
            <button form="staffForm" type="submit" className="btn-primary" disabled={creating}>
              {creating && <Spinner size="sm" className="text-white" />}
              Create Account
            </button>
          </>
        }
      >
        <p className="text-xs text-gray-500 mb-4 p-3 bg-blue-50 rounded-lg">
          A temporary password will be set. The staff member must change it on first login.
        </p>
        <form id="staffForm" onSubmit={handleSubmit(onCreateStaff)} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Peter Otieno" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="peter@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input {...register('phone')} className="input" placeholder="0712345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Role *</label>
              <select {...register('role')} className="input">
                <option value="SECURITY_GUARD">Security Guard</option>
                <option value="CARETAKER">Caretaker</option>
                <option value="PROPERTY_MANAGER">Property Manager</option>
              </select>
            </div>
            <div>
              <label className="label">Assign to Property *</label>
              <select {...register('propertyId')} className="input">
                <option value="">Select property...</option>
                {properties.map(p => (
                  <option key={p.propertyId} value={p.propertyId}>{p.name}</option>
                ))}
              </select>
              {errors.propertyId && <p className="form-error">{errors.propertyId.message}</p>}
            </div>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!tempCred} onClose={() => setTempCred(null)} title="Account created" size="sm">
        <p className="text-sm text-gray-600 mb-3">
          Share these one-time credentials with <span className="font-medium">{tempCred?.name}</span>.
          They must change the password on first login.
        </p>
        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
          <p><span className="text-gray-500">Login:</span> <span className="font-mono">{tempCred?.email}</span></p>
          <p><span className="text-gray-500">Temp password:</span> <span className="font-mono">{tempCred?.password}</span></p>
        </div>
        <button
          className="btn-secondary w-full mt-4"
          onClick={() => { navigator.clipboard?.writeText(`${tempCred?.email} / ${tempCred?.password}`); toast.success('Copied') }}
        >
          Copy credentials
        </button>
      </Modal>
    </div>
  )
}
