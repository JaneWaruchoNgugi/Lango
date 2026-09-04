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
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import type { IncidentType, IncidentSeverity } from '../../types'

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

  const onSubmit = async (data: Form) => {
    if (!user?.propertyId) return
    setBusy(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(user.propertyId, 'incidents', photo) } catch { /* optional */ } }
      await reportIncident({ propertyId: user.propertyId, guard: actor, type: data.type, severity: data.severity, description: data.description, photoUrl })
      const shift = await getActiveShift(user.uid); if (shift) await bumpShiftCounter(shift.shiftId, 'incidentsReported')
      toast.success('Incident reported'); navigate('/gate/incidents')
    } catch { toast.error('Failed to report incident') } finally { setBusy(false) }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/gate/incidents')} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <h1 className="page-title">Report Incident</h1>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="card p-5 space-y-4">
        <div><label className="label">Type *</label><select className="input" {...form.register('type')}>{TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select></div>
        <div><label className="label">Severity *</label><select className="input" {...form.register('severity')}>{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div><label className="label">Description *</label><textarea rows={3} className="input resize-none" {...form.register('description')} />{form.formState.errors.description && <p className="form-error">{form.formState.errors.description.message}</p>}</div>
        <PhotoCapture onCapture={setPhoto} label="Add photo (optional)" />
        <button type="submit" disabled={busy} className="btn-primary w-full py-3">{busy && <Spinner size="sm" className="text-white" />}{busy ? 'Reporting…' : 'Report Incident'}</button>
      </form>
    </div>
  )
}
