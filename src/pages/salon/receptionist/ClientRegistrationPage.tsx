import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { collection, query, where, getDocs, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../../firebase/config'
import { useAuth } from '../../../contexts/AuthContext'
import { PageLoader } from '../../../components/ui/LoadingScreen'
import { Plus, Trash2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import type { SalonProvider, SalonServiceType, SalonClientPricing } from '../../../types'
import { SALON_SERVICE_LABELS } from '../../../types'

const ALL_SERVICES = Object.entries(SALON_SERVICE_LABELS) as [SalonServiceType, string][]

const UNDOING_DEFAULT_NAME = 'Undoing + Wash + Blow-dry'

interface ServiceLine {
  id: string   // temp client-side id
  serviceType: SalonServiceType | ''
  serviceName: string
  providerId: string
  price: string
}

interface ClientEntry {
  id: string   // temp client-side id
  name: string
  phone: string
  services: ServiceLine[]
}

function newService(): ServiceLine {
  return { id: Math.random().toString(36).slice(2), serviceType: '', serviceName: '', providerId: '', price: '' }
}

function newClient(): ClientEntry {
  return { id: Math.random().toString(36).slice(2), name: '', phone: '', services: [newService()] }
}

type Mode = 'single' | 'group'

export default function ClientRegistrationPage() {
  const { salonId }  = useParams<{ salonId: string }>()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [providers, setProviders]             = useState<SalonProvider[]>([])
  const [busyProviderIds, setBusyProviderIds] = useState<Set<string>>(new Set())
  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]       = useState(false)
  const [mode, setMode]           = useState<Mode>('single')
  const [clients, setClients]     = useState<ClientEntry[]>([newClient()])
  const [groupLabel, setGroupLabel] = useState('')

  useEffect(() => {
    if (!salonId) return
    Promise.all([
      getDocs(query(collection(db, 'salonProviders'), where('salonId', '==', salonId), where('status', '==', 'ACTIVE'))),
      getDocs(query(collection(db, 'salonServices'), where('salonId', '==', salonId), where('status', '==', 'IN_PROGRESS'))),
    ])
      .then(([provSnap, busySnap]) => {
        setProviders(provSnap.docs.map(d => d.data() as SalonProvider))
        setBusyProviderIds(new Set(busySnap.docs.map(d => d.data().providerId as string).filter(Boolean)))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [salonId])

  const updateClient = (clientId: string, field: keyof Omit<ClientEntry, 'id' | 'services'>, value: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, [field]: value } : c))
  }

  const updateService = (clientId: string, serviceId: string, field: keyof Omit<ServiceLine, 'id'>, value: string) => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      services: c.services.map(s => s.id === serviceId ? { ...s, [field]: value } : s),
    }))
  }

  const changeServiceType = (clientId: string, serviceId: string, newType: string) => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c,
      services: c.services.map(s => {
        if (s.id !== serviceId) return s
        const updates: Partial<ServiceLine> = { serviceType: newType as SalonServiceType | '' }
        if (newType === 'HAIR_UNDOING' && !s.serviceName) {
          updates.serviceName = UNDOING_DEFAULT_NAME
        } else if (s.serviceType === 'HAIR_UNDOING' && newType !== 'HAIR_UNDOING' && s.serviceName === UNDOING_DEFAULT_NAME) {
          updates.serviceName = ''
        }
        return { ...s, ...updates }
      }),
    }))
  }

  const addService = (clientId: string) => {
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, services: [...c.services, newService()] } : c))
  }

  const removeService = (clientId: string, serviceId: string) => {
    setClients(prev => prev.map(c => c.id !== clientId ? c : {
      ...c, services: c.services.filter(s => s.id !== serviceId),
    }))
  }

  const addClient = () => setClients(prev => [...prev, newClient()])
  const removeClient = (id: string) => setClients(prev => prev.filter(c => c.id !== id))

  const validate = (): string | null => {
    for (const c of clients) {
      if (!c.name.trim()) return 'All clients need a name'
      if (!c.phone.trim()) return 'All clients need a phone number'
      for (const s of c.services) {
        if (!s.serviceType) return `Select a service type for ${c.name}`
        if (!s.providerId)  return `Assign a provider for ${c.name}'s service`
        if (!s.price || isNaN(Number(s.price)) || Number(s.price) < 0) return `Enter a valid price for ${c.name}'s service`
      }
    }
    if (mode === 'group' && !groupLabel.trim()) return 'Enter a group/package name'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) { toast.error(err); return }
    if (!salonId || !user) return

    setSaving(true)
    try {
      const batch   = writeBatch(db)
      const now     = serverTimestamp() as Timestamp
      const receptionistId   = user.uid
      const receptionistName = user.profile?.name ?? 'Receptionist'

      let packageId: string | null = null
      if (mode === 'group') {
        const pkgRef = doc(collection(db, 'salonPackages'))
        packageId = pkgRef.id
        const totalAmount = clients.flatMap(c => c.services).reduce((s, sv) => s + Number(sv.price), 0)
        batch.set(pkgRef, {
          packageId, salonId,
          label: groupLabel.trim(),
          memberClientIds: [],  // will be filled below
          memberNames: clients.map(c => c.name.trim()),
          totalAmount, status: 'PENDING',
          receptionistId, receptionistName,
          createdAt: now, updatedAt: now,
        })
      }

      const allClientIds: string[] = []

      for (const clientEntry of clients) {
        const clientRef = doc(collection(db, 'salonClients'))
        const clientId  = clientRef.id
        allClientIds.push(clientId)

        batch.set(clientRef, {
          clientId, salonId,
          name: clientEntry.name.trim(),
          phone: clientEntry.phone.trim(),
          packageId: packageId ?? null,
          status: 'ACTIVE',
          receptionistId, receptionistName,
          checkoutId: null,
          createdAt: now, updatedAt: now,
        })

        const servicesPricing: SalonClientPricing['servicesPricing'] = []
        const serviceDate = Timestamp.now()

        for (const svc of clientEntry.services) {
          const providerDoc = providers.find(p => p.providerId === svc.providerId)!
          const serviceRef  = doc(collection(db, 'salonServices'))
          const serviceId   = serviceRef.id

          batch.set(serviceRef, {
            serviceId, salonId,
            clientId, clientName: clientEntry.name.trim(),
            providerId: svc.providerId,
            providerUid: providerDoc.uid ?? null,
            providerName: providerDoc.name,
            providerCode: providerDoc.providerCode,
            serviceType: svc.serviceType as SalonServiceType,
            serviceName: svc.serviceName.trim() || null,
            status: 'IN_PROGRESS',
            serviceDate,
            receptionistId,
            createdAt: now, updatedAt: now,
          })

          servicesPricing.push({
            serviceId, serviceType: svc.serviceType as SalonServiceType,
            providerId: svc.providerId,
            price: Number(svc.price),
          })
        }

        // Pricing doc — same ID as clientId so it's easy to look up
        const pricingRef = doc(db, 'salonClientPricing', clientId)
        const totalAmount = servicesPricing.reduce((s, sp) => s + sp.price, 0)
        batch.set(pricingRef, {
          clientId, salonId, servicesPricing, totalAmount, updatedAt: now,
        })
      }

      // Patch packageId's memberClientIds now we have them
      if (packageId) {
        const pkgRef = doc(db, 'salonPackages', packageId)
        batch.update(pkgRef, { memberClientIds: allClientIds })
      }

      await batch.commit()
      toast.success(mode === 'group' ? 'Group package registered!' : 'Client registered!')
      navigate(`/salon/${salonId}/receptionist`)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message ?? 'Failed to register client')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Register Client</h1>
          <p className="page-subtitle">Record services and assign providers</p>
        </div>
        <div className="flex gap-1">
          {(['single', 'group'] as Mode[]).map(m => (
            <button key={m} onClick={() => { setMode(m); setClients([newClient()]) }}
              className={`text-xs px-3 py-1.5 rounded-lg border ${mode === m ? 'bg-lango-primary text-white border-lango-primary' : 'border-gray-200 text-gray-600'}`}>
              {m === 'single' ? 'Single Client' : 'Group / Package'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'group' && (
        <div className="card p-4">
          <label className="label">Group / Package Name</label>
          <input value={groupLabel} onChange={e => setGroupLabel(e.target.value)}
            className="input" placeholder="e.g. Mama + Mtoto package" />
        </div>
      )}

      {clients.map((clientEntry, ci) => (
        <div key={clientEntry.id} className="card">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">
              {mode === 'group' ? `Client ${ci + 1}` : 'Client Details'}
            </h3>
            {mode === 'group' && clients.length > 1 && (
              <button onClick={() => removeClient(clientEntry.id)} className="text-xs text-red-500 hover:text-red-700">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Name</label>
                <input value={clientEntry.name} onChange={e => updateClient(clientEntry.id, 'name', e.target.value)}
                  className="input" placeholder="Client full name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={clientEntry.phone} onChange={e => updateClient(clientEntry.id, 'phone', e.target.value)}
                  className="input" placeholder="+254..." />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Services</p>
              {clientEntry.services.map((svc, si) => (
                <div key={svc.id} className="p-3 bg-gray-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">Service {si + 1}</p>
                    {clientEntry.services.length > 1 && (
                      <button onClick={() => removeService(clientEntry.id, svc.id)} className="text-xs text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Service Type</label>
                      <select value={svc.serviceType}
                        onChange={e => changeServiceType(clientEntry.id, svc.id, e.target.value)}
                        className="input">
                        <option value="">Select...</option>
                        {ALL_SERVICES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      {svc.serviceType === 'HAIR_UNDOING' && (
                        <p className="text-xs text-lango-primary mt-1">+ Hair Washing & Blow-dry included</p>
                      )}
                    </div>
                    <div>
                      <label className="label">Hairstyle / Service Name</label>
                      <input value={svc.serviceName}
                        onChange={e => updateService(clientEntry.id, svc.id, 'serviceName', e.target.value)}
                        className="input" placeholder="e.g. Box Braids, Relaxer..." />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="label">Provider</label>
                      {(() => {
                        const filtered = providers.filter(p => !svc.serviceType || p.services.includes(svc.serviceType as SalonServiceType))
                        const available = filtered.filter(p => !busyProviderIds.has(p.providerId))
                        const busy      = filtered.filter(p => busyProviderIds.has(p.providerId))
                        return (
                          <select value={svc.providerId}
                            onChange={e => updateService(clientEntry.id, svc.id, 'providerId', e.target.value)}
                            className="input">
                            <option value="">Select provider...</option>
                            {available.length > 0 && (
                              <optgroup label="✓ Available">
                                {available.map(p => <option key={p.providerId} value={p.providerId}>{p.name} ({p.providerCode})</option>)}
                              </optgroup>
                            )}
                            {busy.length > 0 && (
                              <optgroup label="◷ Currently Busy">
                                {busy.map(p => <option key={p.providerId} value={p.providerId}>{p.name} ({p.providerCode})</option>)}
                              </optgroup>
                            )}
                          </select>
                        )
                      })()}
                    </div>
                    <div>
                      <label className="label">Price (KES)</label>
                      <input type="number" min="0" value={svc.price}
                        onChange={e => updateService(clientEntry.id, svc.id, 'price', e.target.value)}
                        className="input" placeholder="0" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => addService(clientEntry.id)} className="btn-ghost text-xs">
                <Plus className="w-3.5 h-3.5" /> Add Service
              </button>
            </div>
          </div>
        </div>
      ))}

      {mode === 'group' && (
        <button onClick={addClient} className="btn-secondary w-full">
          <Users className="w-4 h-4" /> Add Another Client to Group
        </button>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(`/salon/${salonId}/receptionist`)} className="btn-secondary">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : mode === 'group' ? 'Register Group' : 'Register Client'}
        </button>
      </div>
    </div>
  )
}
