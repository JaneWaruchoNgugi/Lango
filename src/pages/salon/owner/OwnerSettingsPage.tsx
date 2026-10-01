import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { Salon } from '../../../types'

export default function OwnerSettingsPage() {
  const { salonId } = useParams<{ salonId: string }>()
  const { user }    = useAuth()
  const [salon, setSalon]   = useState<Salon | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [name, setName]       = useState('')
  const [phone, setPhone]     = useState('')
  const [location, setLocation] = useState('')

  useEffect(() => {
    if (!salonId) return
    getDoc(doc(db, 'salons', salonId))
      .then(snap => {
        if (snap.exists()) {
          const data = snap.data() as Salon
          setSalon(data)
          setName(data.name)
          setPhone(data.phone)
          setLocation(data.location)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [salonId])

  const handleSave = async () => {
    if (!salonId) return
    if (!name.trim()) { toast.error('Salon name is required'); return }
    setSaving(true)
    try {
      await updateDoc(doc(db, 'salons', salonId), {
        name: name.trim(),
        phone: phone.trim(),
        location: location.trim(),
        updatedAt: serverTimestamp(),
      })
      toast.success('Salon info updated')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <h1 className="page-title">Settings</h1>

      <div className="card p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Salon Information</p>
        <div>
          <label className="label">Salon Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Salon name" />
        </div>
        <div>
          <label className="label">Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="+254..." />
        </div>
        <div>
          <label className="label">Location</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className="input" placeholder="e.g. Westlands, Nairobi" />
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <p className="text-xs text-gray-400">
            Initials: <span className="font-mono">{salon?.initials}</span>
            {' · '}Status: <span className={salon?.status === 'ACTIVE' ? 'text-green-600 font-medium' : 'text-gray-500'}>{salon?.status}</span>
          </p>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="card p-5 space-y-2 text-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Account</p>
        <p><span className="text-gray-500">Name:</span> {user?.profile?.name}</p>
        <p><span className="text-gray-500">Email:</span> {user?.email}</p>
        <p><span className="text-gray-500">Role:</span> Salon Owner</p>
        <p><span className="text-gray-500">Salon ID:</span> <span className="font-mono text-xs">{salonId}</span></p>
      </div>
    </div>
  )
}
