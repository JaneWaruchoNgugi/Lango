import { useEffect, useState } from 'react'
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { propertyDoc } from '../../firebase/collections'
import { useAuth } from '../../contexts/AuthContext'
import { canManageUnits } from '../../domain/permissions'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Settings as SettingsIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Property } from '../../types'

export default function SettingsPage() {
  const { user } = useAuth()
  const canEdit = canManageUnits(user?.role)
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ primaryContact: '', phone: '', email: '', address: '' })

  useEffect(() => {
    if (!user?.propertyId) { setLoading(false); return }
    getDoc(propertyDoc(user.propertyId)).then(s => {
      if (s.exists()) { const p = s.data() as Property; setProperty(p); setForm({ primaryContact: p.primaryContact ?? '', phone: p.phone ?? '', email: p.email ?? '', address: p.address ?? '' }) }
    }).catch(e => console.error(e)).finally(() => setLoading(false))
  }, [user?.propertyId])

  const save = async () => {
    if (!user?.propertyId) return
    setBusy(true)
    try { await updateDoc(propertyDoc(user.propertyId), { ...form, updatedAt: serverTimestamp() }); toast.success('Settings saved') }
    catch (e) { console.error(e); toast.error('Save failed') } finally { setBusy(false) }
  }
  if (loading) return <PageLoader />

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0"><SettingsIcon className="w-5 h-5 text-lango-primary" /></div>
        <div><h1 className="text-xl font-bold text-gray-900">Settings</h1><p className="text-sm text-gray-500">Manage your property details.</p></div>
      </div>
      <div className="card p-5 space-y-4">
        <div><p className="text-xs text-gray-500">Property</p><p className="font-semibold text-gray-900">{property?.name ?? '—'}</p></div>
        <div><label className="label">Primary contact</label><input className="input" value={form.primaryContact} onChange={e => setForm({ ...form, primaryContact: e.target.value })} disabled={!canEdit} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} disabled={!canEdit} /></div>
          <div><label className="label">Email</label><input className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!canEdit} /></div>
        </div>
        <div><label className="label">Address</label><input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} disabled={!canEdit} /></div>
        {canEdit && <button className="btn-primary" disabled={busy} onClick={save}>{busy && <Spinner size="sm" className="text-white" />}Save settings</button>}
      </div>
    </div>
  )
}
