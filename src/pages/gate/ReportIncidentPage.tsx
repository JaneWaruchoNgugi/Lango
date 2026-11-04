import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../contexts/AuthContext'
import { reportIncident } from '../../services/incidentService'
import { bumpShiftCounter, getActiveShift } from '../../services/shiftService'
import { uploadPhoto } from '../../services/photoService'
import { PhotoCapture } from '../../components/ui/PhotoCapture'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import type { IncidentType, IncidentSeverity } from '../../types'
import { PageHeader } from '../../components/ui/PageHeader'
import { humanize } from '../../utils/humanize'

const schema = z.object({
  type: z.enum(['SUSPICIOUS_VISITOR', 'UNAUTHORIZED_ENTRY', 'DISPUTE', 'THEFT', 'EMERGENCY', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z.string().min(4, 'Describe what happened'),
})
type Form = z.infer<typeof schema>
const TYPES: IncidentType[] = ['SUSPICIOUS_VISITOR', 'UNAUTHORIZED_ENTRY', 'DISPUTE', 'THEFT', 'EMERGENCY', 'OTHER']
const SEVERITIES: IncidentSeverity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export default function ReportIncidentPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const form = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { severity: 'MEDIUM', type: 'SUSPICIOUS_VISITOR' } })
  const severity = form.watch('severity')

  const onSubmit = async (data: Form) => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(user.propertyId, 'incidents', photo) } catch { /* optional */ } }
      await reportIncident({ propertyId: user.propertyId, guard: actor, type: data.type, severity: data.severity, description: data.description, photoUrl })
      const shift = await getActiveShift(user.uid, user.propertyId); if (shift) await bumpShiftCounter(shift.shiftId, 'incidentsReported')
      toast.success('Incident reported'); navigate('/gate/incidents')
    } catch { toast.error('Failed to report incident') } finally { setBusy(false) }
  }

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader backTo="/gate/incidents" title="Report an incident" subtitle="It's shared with the property manager straight away." />
      <form onSubmit={form.handleSubmit(onSubmit)} className="card p-5 sm:p-6 space-y-5">
        <div><label className="label">What happened?</label><select className="input" {...form.register('type')}>{TYPES.map(t => <option key={t} value={t}>{humanize(t)}</option>)}</select></div>
        <div>
          <p className="label">How serious is it?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {SEVERITIES.map(s => {
              const active = severity === s
              const tone = { LOW: 'peer-checked:border-gray-500 peer-checked:bg-gray-50', MEDIUM: 'peer-checked:border-amber-500 peer-checked:bg-amber-50', HIGH: 'peer-checked:border-orange-500 peer-checked:bg-orange-50', CRITICAL: 'peer-checked:border-red-500 peer-checked:bg-red-50' }[s]
              return (
                <label key={s} className="cursor-pointer">
                  <input type="radio" value={s} className="peer sr-only" {...form.register('severity')} />
                  <span className={`block text-center rounded-lg border-2 border-gray-200 px-3 py-2 text-sm font-medium transition-colors ${tone} ${active ? 'text-gray-900' : 'text-gray-600'}`}>{humanize(s)}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div><label className="label">Description</label><textarea rows={4} className="input resize-none" placeholder="Who was involved, where, and what you did." {...form.register('description')} />{form.formState.errors.description && <p className="form-error">{form.formState.errors.description.message}</p>}</div>
        <PhotoCapture onCapture={setPhoto} label="Add photo (optional)" />
        <button type="submit" disabled={busy} className="btn-primary w-full !min-h-11">{busy && <Spinner size="sm" className="text-white" />}{busy ? 'Reporting…' : 'Report incident'}</button>
      </form>
    </div>
  )
}
