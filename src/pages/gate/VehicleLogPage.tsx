import { useEffect, useMemo, useState } from 'react'
import { getDocs, query, where, orderBy, limit, addDoc, updateDoc, doc, serverTimestamp, collection, Timestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { Car, Plus, Search, LogOut } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, differenceInMinutes } from 'date-fns'
import toast from 'react-hot-toast'
import type { VehicleEntry, VehicleType } from '../../types'

const schema = z.object({
  plate:        z.string().min(1, 'Plate required').toUpperCase(),
  vehicleType:  z.enum(['CAR', 'MOTORBIKE', 'VAN', 'TRUCK', 'OTHER']),
  makeModel:    z.string().optional(),
  driverName:   z.string().min(2, 'Driver name required'),
  driverPhone:  z.string().optional(),
  unitVisiting: z.string().optional(),
  purpose:      z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function VehicleLogPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''

  const [entries,  setEntries]  = useState<VehicleEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [nowMs,    setNowMs]    = useState(Date.now())

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { vehicleType: 'CAR' },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'vehicleLog'), where('propertyId', '==', pid), orderBy('checkIn', 'desc'), limit(100)))
      .then(snap => setEntries(snap.docs.map(d => ({ ...d.data(), id: d.id } as VehicleEntry))))
      .catch(e => console.error('[VehicleLog]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  // Update clock every minute so duration columns stay fresh
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  const shown = useMemo(() => {
    if (!search) return entries
    const q = search.toLowerCase()
    return entries.filter(e =>
      e.plate.toLowerCase().includes(q) || e.driverName.toLowerCase().includes(q)
    )
  }, [entries, search])

  const checkOut = async (e: VehicleEntry) => {
    try {
      await updateDoc(doc(db, 'vehicleLog', e.id), { checkOut: Timestamp.now() })
      setEntries(prev => prev.map(x => x.id === e.id ? { ...x, checkOut: Timestamp.now() } : x))
      toast.success('Vehicle checked out')
    } catch { toast.error('Update failed') }
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      await addDoc(collection(db, 'vehicleLog'), {
        propertyId:        pid,
        plate:             data.plate.toUpperCase(),
        vehicleType:       data.vehicleType,
        makeModel:         data.makeModel || null,
        driverName:        data.driverName,
        driverPhone:       data.driverPhone || null,
        unitVisiting:      data.unitVisiting || null,
        purpose:           data.purpose || null,
        checkIn:           Timestamp.now(),
        checkOut:          null,
        registeredBy:      user?.uid ?? '',
        registeredByName:  user?.profile?.name ?? '',
        createdAt:         serverTimestamp(),
      })
      toast.success('Vehicle logged')
      setShowAdd(false)
      reset()
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const durationStr = (entry: VehicleEntry): string => {
    const outMs = entry.checkOut?.toMillis() ?? nowMs
    const mins = differenceInMinutes(new Date(outMs), entry.checkIn.toDate())
    if (mins < 60) return `${mins}m`
    return `${Math.floor(mins / 60)}h ${mins % 60}m`
  }

  if (loading) return <PageLoader />

  const inside = entries.filter(e => !e.checkOut).length

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Vehicle Log</h1>
            <p className="text-sm text-gray-500">{inside} inside · {entries.length} total today</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => { reset(); setShowAdd(true) }}>
          <Plus className="w-4 h-4" /> Log Vehicle
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search plate or driver…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {shown.length === 0 ? (
        <div className="card p-10 text-center">
          <Car className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No vehicles logged yet.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Plate</th>
                  <th>Type</th>
                  <th>Driver</th>
                  <th>Unit</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(e => (
                  <tr key={e.id} className={!e.checkOut ? 'bg-green-50/30' : ''}>
                    <td className="font-mono font-bold text-gray-900">{e.plate}</td>
                    <td className="text-gray-500">{e.vehicleType}</td>
                    <td className="text-gray-700">
                      <div>{e.driverName}</div>
                      {e.driverPhone && <div className="text-xs text-gray-400">{e.driverPhone}</div>}
                    </td>
                    <td className="text-gray-500">{e.unitVisiting ?? '—'}</td>
                    <td className="text-gray-500">{format(e.checkIn.toDate(), 'h:mm a')}</td>
                    <td className="text-gray-500">
                      {e.checkOut ? format(e.checkOut.toDate(), 'h:mm a') : <span className="badge badge-green text-xs">Inside</span>}
                    </td>
                    <td className="text-gray-500">{durationStr(e)}</td>
                    <td>
                      {!e.checkOut && (
                        <button onClick={() => checkOut(e)} className="flex items-center gap-1 text-xs btn-secondary px-2.5 py-1">
                          <LogOut className="w-3 h-3" /> Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Log Vehicle Entry" size="md"
        footer={
          <>
            <button onClick={() => setShowAdd(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button form="vehicleForm" type="submit" className="btn-primary" disabled={saving}>
              {saving && <Spinner size="sm" className="text-white" />} Log In
            </button>
          </>
        }
      >
        <form id="vehicleForm" onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Plate Number *</label>
              <input {...register('plate')} className="input font-mono uppercase" placeholder="KAA 000A" />
              {errors.plate && <p className="form-error">{errors.plate.message}</p>}
            </div>
            <div>
              <label className="label">Vehicle Type *</label>
              <select {...register('vehicleType')} className="input">
                {(['CAR','MOTORBIKE','VAN','TRUCK','OTHER'] as VehicleType[]).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Make / Model</label>
              <input {...register('makeModel')} className="input" placeholder="e.g. Toyota Probox" />
            </div>
            <div>
              <label className="label">Driver Name *</label>
              <input {...register('driverName')} className="input" placeholder="e.g. John Mwangi" />
              {errors.driverName && <p className="form-error">{errors.driverName.message}</p>}
            </div>
            <div>
              <label className="label">Driver Phone</label>
              <input {...register('driverPhone')} className="input" placeholder="0712…" />
            </div>
            <div>
              <label className="label">Unit Visiting</label>
              <input {...register('unitVisiting')} className="input" placeholder="e.g. B04" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Purpose</label>
              <input {...register('purpose')} className="input" placeholder="e.g. Delivery, Maintenance…" />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
