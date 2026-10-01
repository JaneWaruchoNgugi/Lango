import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase/config'
import { Plus, Building2, Search, MapPin, Trash2 } from 'lucide-react'
import { PropertyStatusBadge } from '../../components/ui/StatusBadge'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import type { Property, PropertyStatus } from '../../types'
import toast from 'react-hot-toast'

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'ALL'>('ALL')
  const [propToDelete, setPropToDelete]     = useState<Property | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [deleting, setDeleting]             = useState(false)

  useEffect(() => {
    getDocs(query(collection(db, 'properties'), orderBy('createdAt', 'desc')))
      .then(snap => {
        setProperties(snap.docs.map(d => d.data() as Property))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const onDeleteProperty = async () => {
    if (!propToDelete || deleteConfirmName !== propToDelete.name) return
    setDeleting(true)
    try {
      const fn = httpsCallable<{ propertyId: string }, { ok: boolean }>(functions, 'deleteProperty')
      await fn({ propertyId: propToDelete.propertyId })
      setProperties(prev => prev.filter(p => p.propertyId !== propToDelete.propertyId))
      toast.success('Property deleted')
      setPropToDelete(null)
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete property')
    } finally {
      setDeleting(false)
    }
  }

  const filtered = properties.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  if (loading) return <PageLoader />

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Properties</h1>
          <p className="page-subtitle">{properties.length} total properties on the platform</p>
        </div>
        <Link to="/admin/properties/new" className="btn-primary">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Property</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search properties..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as PropertyStatus | 'ALL')}
          className="input sm:w-40"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="TRIAL">Trial</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Properties Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={search || filterStatus !== 'ALL' ? 'No properties match your search' : 'No properties yet'}
          description={search || filterStatus !== 'ALL' ? 'Try adjusting your filters.' : 'Add your first property to get started.'}
          action={
            !search && filterStatus === 'ALL' ? (
              <Link to="/admin/properties/new" className="btn-primary text-xs">
                <Plus className="w-3 h-3" /> Add Property
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(prop => (
            <div key={prop.propertyId} className="relative group">
              <Link
                to={`/admin/properties/${prop.propertyId}`}
                className="card p-5 hover:shadow-card-hover transition-all duration-150 block"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-lango-light rounded-xl flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                    <Building2 className="w-5 h-5 text-lango-primary" />
                  </div>
                  <PropertyStatusBadge status={prop.status} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{prop.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{prop.city}, {prop.county}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900">{prop.numberOfBlocks ?? 0}</p>
                    <p className="text-xs text-gray-400">Blocks</p>
                  </div>
                  <div className="text-center border-x border-gray-100">
                    <p className="text-sm font-bold text-gray-900">
                      {prop.totalUnits && prop.totalUnits > 0 ? prop.totalUnits : '—'}
                    </p>
                    <p className="text-xs text-gray-400">Units</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-gray-900 capitalize">{prop.plan.toLowerCase()}</p>
                    <p className="text-xs text-gray-400">Plan</p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => { setPropToDelete(prop); setDeleteConfirmName('') }}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                title="Delete property"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!propToDelete}
        onClose={() => setPropToDelete(null)}
        title="Delete property"
        size="sm"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPropToDelete(null)} disabled={deleting}>Cancel</button>
            <button
              className="btn-danger"
              disabled={deleteConfirmName !== propToDelete?.name || deleting}
              onClick={onDeleteProperty}
            >
              {deleting && <Spinner size="sm" className="text-white" />}
              Delete permanently
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            This permanently deletes <span className="font-medium">{propToDelete?.name}</span> and all related data. This cannot be undone.
          </p>
          <div>
            <label className="label">
              Type <span className="font-mono text-red-600">{propToDelete?.name}</span> to confirm
            </label>
            <input
              className="input"
              value={deleteConfirmName}
              onChange={e => setDeleteConfirmName(e.target.value)}
              placeholder={propToDelete?.name}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
