import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { VISIT_TYPE_OPTIONS, WORK_TYPES, SERVICE_TYPES, VISIT_TYPE_LABEL } from '../../domain/visitTypes'
import { registerGuestSchema, type RegisterGuestInput } from '../../domain/registerSchemas'
import { registerVisitor } from '../../services/visitorService'
import { registerDelivery } from '../../services/deliveryService'
import { bumpShiftCounter } from '../../services/shiftService'
import { sendVisitorNotification } from '../../services/NotificationService'
import { uploadPhoto } from '../../services/photoService'
import { TenantSearchField } from '../../components/gate/TenantSearchField'
import { PhotoCapture } from '../../components/ui/PhotoCapture'
import { Spinner } from '../../components/ui/LoadingScreen'
import type { VisitType, Tenant, PreApprovedVisitor } from '../../types'

type Visiting = { blockId: string; blockName: string; unitId: string; unitNumber: string; tenantId?: string; tenantName?: string; tenantPhone?: string }

export default function RegisterGuestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const propertyId = user?.propertyId ?? ''
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { shift } = useShift(user?.uid)

  const [step, setStep] = useState(0)
  const [visitType, setVisitType] = useState<VisitType | null>(null)
  const [visiting, setVisiting] = useState<Visiting | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<{ name: string; type: VisitType } | null>(null)

  // useForm typed as FieldValues to avoid discriminated-union resolver generic conflicts;
  // onSubmit casts to RegisterGuestInput which is validated by zod at runtime.
  const form = useForm<FieldValues>({ resolver: zodResolver(registerGuestSchema) as never })
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  const chooseType = (t: VisitType) => {
    setVisitType(t)
    // Reset both the form and the selection state so switching type never leaves
    // a stale tenant label with cleared blockId/unitId (which would block submit).
    setVisiting(null)
    setPhoto(null)
    form.reset({ visitType: t, nationality: 'Kenyan' } as never)
    setStep(1)
  }

  const applyTenant = (t: Tenant) => {
    setVisiting({ blockId: t.blockId, blockName: t.blockName, unitId: t.unitId, unitNumber: t.unitNumber, tenantId: t.tenantId, tenantName: t.fullName, tenantPhone: t.whatsappNumber || t.phoneNumber })
    form.setValue('blockId', t.blockId); form.setValue('unitId', t.unitId)
  }
  const applyPreApproved = (p: PreApprovedVisitor) => {
    setVisiting({ blockId: '', blockName: '', unitId: p.unitId, unitNumber: p.unitNumber, tenantId: p.tenantId, tenantName: p.tenantName })
    form.setValue('unitId', p.unitId); form.setValue('blockId', 'preapproved')
    form.setValue('visitorName', p.name)
  }

  const onSubmit = async (raw: FieldValues) => {
    const data = raw as RegisterGuestInput
    if (!propertyId || !visiting) { toast.error('Select who is being visited'); return }
    setSubmitting(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(propertyId, data.visitType === 'DELIVERY' ? 'deliveries' : 'visitors', photo) } catch { toast('Photo upload skipped (offline)') } }

      if (data.visitType === 'DELIVERY') {
        const id = await registerDelivery({
          propertyId, guard: actor, shiftId: shift?.shiftId,
          company: data.company, riderName: data.visitorName, riderPhone: data.phone, riderIdNumber: data.idNumber || undefined,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          packageDescription: data.packageDescription, photoUrl, notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'deliveriesRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'DELIVERY_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { unitNumber: visiting.unitNumber, company: data.company, riderName: data.visitorName, description: data.packageDescription ?? '' } })
      } else {
        const id = await registerVisitor({
          propertyId, guard: actor, shiftId: shift?.shiftId, visitType: data.visitType,
          visitorName: data.visitorName, phone: data.phone, idNumber: data.idNumber || undefined, nationality: data.nationality || undefined, photoUrl,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          reason: data.visitType === 'FRIENDLY_VISIT' ? data.reason : undefined,
          company: 'company' in data ? data.company : undefined,
          workType: data.visitType === 'WORK' ? data.workType : undefined,
          workDescription: data.visitType === 'WORK' ? data.workDescription : undefined,
          serviceType: data.visitType === 'SERVICE_PROVIDER' ? data.serviceType : undefined,
          serviceDescription: data.visitType === 'SERVICE_PROVIDER' ? data.serviceDescription : undefined,
          expectedDurationMins: 'expectedDurationMins' in data ? data.expectedDurationMins : undefined,
          notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'visitorsRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'VISITOR_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { visitorName: data.visitorName, unitNumber: visiting.unitNumber, visitType: VISIT_TYPE_LABEL[data.visitType], reason: ('reason' in data ? data.reason : '') ?? '', idNumber: data.idNumber ?? '' } })
      }
      setDone({ name: data.visitorName, type: data.visitType })
      toast.success('Guest registered')
    } catch (err) {
      console.error(err); toast.error('Unable to register guest. Check your connection and try again.')
    } finally { setSubmitting(false) }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full"><CheckCircle className="w-10 h-10 text-green-600" /></div>
        <h2 className="text-xl font-bold text-gray-900">Guest Registered</h2>
        <p className="text-gray-600">{done.name} · {VISIT_TYPE_LABEL[done.type]}{visiting ? ` · ${visiting.blockName} ${visiting.unitNumber}` : ''}</p>
        <div className="flex flex-col gap-3 pt-2">
          <button className="btn-primary w-full py-3" onClick={() => { setDone(null); setStep(0); setVisitType(null); setVisiting(null); setPhoto(null); form.reset() }}>Register Another Guest</button>
          <button className="btn-secondary w-full py-3" onClick={() => navigate('/gate')}>Back to Gate</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => step === 0 ? navigate('/gate') : setStep(s => s - 1)} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="page-title">Register a Guest</h1><p className="page-subtitle">Step {step + 1} of 3</p></div>
      </div>

      {step === 0 && (
        <div className="space-y-3">
          <h3 className="section-title">Type of Visit</h3>
          {VISIT_TYPE_OPTIONS.map(o => (
            <button key={o.value} onClick={() => chooseType(o.value)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 hover:border-lango-primary text-left">
              <span className="text-2xl">{o.emoji}</span>
              <div><p className="font-semibold text-gray-900">{o.label}</p><p className="text-xs text-gray-500">{o.hint}</p></div>
            </button>
          ))}
        </div>
      )}

      {step === 1 && visitType && (
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="section-title mb-0">{visitType === 'DELIVERY' ? 'Delivery Person' : 'Guest Information'}</h3>
            <div><label className="label">{visitType === 'DELIVERY' ? 'Rider/Driver Name *' : 'Full Name *'}</label>
              <input className="input" {...form.register('visitorName')} autoFocus />
              {errors.visitorName && <p className="form-error">{errors.visitorName.message}</p>}</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Phone *</label><input className="input" inputMode="tel" {...form.register('phone')} />
                {errors.phone && <p className="form-error">{errors.phone.message}</p>}</div>
              <div><label className="label">ID / Passport</label><input className="input" {...form.register('idNumber')} /></div>
            </div>
            {visitType !== 'DELIVERY' && <div><label className="label">Nationality</label><input className="input" {...form.register('nationality')} /></div>}
            <PhotoCapture onCapture={setPhoto} />
          </div>
          <div className="card p-5 space-y-3">
            <h3 className="section-title mb-0">Visiting</h3>
            <TenantSearchField propertyId={propertyId} onSelectTenant={applyTenant} onSelectPreApproved={applyPreApproved}
              selectedLabel={visiting ? `${visiting.tenantName ?? 'Unit'} · ${visiting.blockName} ${visiting.unitNumber}` : undefined} />
            {errors.unitId && <p className="form-error">{errors.unitId.message}</p>}
          </div>
          <button className="btn-primary w-full py-3" onClick={() => { if (!visiting) { toast.error('Select who is being visited'); return } setStep(2) }}>Next <ArrowRight className="w-4 h-4" /></button>
        </div>
      )}

      {step === 2 && visitType && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="section-title mb-0">Visit Details</h3>

            {visitType === 'FRIENDLY_VISIT' && (
              <div><label className="label">Reason (optional)</label><input className="input" placeholder="Personal visit, family…" {...form.register('reason')} /></div>
            )}

            {visitType === 'WORK' && (<>
              <div><label className="label">Type of Work *</label>
                <select className="input" {...form.register('workType')}>
                  <option value="">Select…</option>{WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>{errors.workType && <p className="form-error">{errors.workType.message}</p>}</div>
              <div><label className="label">Description *</label><textarea rows={2} className="input resize-none" placeholder="e.g. Replacing kitchen sink" {...form.register('workDescription')} />
                {errors.workDescription && <p className="form-error">{errors.workDescription.message}</p>}</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Company</label><input className="input" {...form.register('company')} /></div>
                <div><label className="label">Duration (mins)</label><input className="input" inputMode="numeric" {...form.register('expectedDurationMins')} /></div>
              </div>
            </>)}

            {visitType === 'DELIVERY' && (<>
              <div><label className="label">Delivery Company *</label><input className="input" placeholder="DHL, Glovo, Jumia…" {...form.register('company')} />
                {errors.company && <p className="form-error">{errors.company.message}</p>}</div>
              <div><label className="label">Package Description</label><input className="input" placeholder="Food, parcel, documents…" {...form.register('packageDescription')} /></div>
            </>)}

            {visitType === 'SERVICE_PROVIDER' && (<>
              <div><label className="label">What service are you here to provide? *</label>
                <input className="input" list="service-types" placeholder="e.g. Internet Installation" {...form.register('serviceType')} />
                <datalist id="service-types">{SERVICE_TYPES.map(s => <option key={s} value={s} />)}</datalist>
                {errors.serviceType && <p className="form-error">{errors.serviceType.message}</p>}</div>
              <div><label className="label">Description</label><textarea rows={2} className="input resize-none" placeholder="e.g. Installing a new fiber connection" {...form.register('serviceDescription')} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Company</label><input className="input" {...form.register('company')} /></div>
                <div><label className="label">Duration (mins)</label><input className="input" inputMode="numeric" {...form.register('expectedDurationMins')} /></div>
              </div>
            </>)}
          </div>

          <div className="card p-4 bg-gray-50 space-y-1 text-sm">
            <p className="text-gray-500">Guest: <span className="font-medium text-gray-900">{form.watch('visitorName')}</span></p>
            <p className="text-gray-500">Type: <span className="font-medium text-gray-900">{VISIT_TYPE_LABEL[visitType]}</span></p>
            {visiting && <p className="text-gray-500">Visiting: <span className="font-medium text-gray-900">{visiting.blockName} {visiting.unitNumber}{visiting.tenantName ? ` · ${visiting.tenantName}` : ''}</span></p>}
          </div>

          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting && <Spinner size="sm" className="text-white" />}{submitting ? 'Registering…' : 'Register Guest'}
          </button>
        </form>
      )}
    </div>
  )
}
