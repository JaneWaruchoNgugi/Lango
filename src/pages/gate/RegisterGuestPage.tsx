import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft, ArrowRight, ChevronRight, CheckCircle, ShieldCheck, Building2,
  User, Phone, CreditCard, Car, Users, Home, Wrench, Clock, Package, Hash,
  Briefcase, Minus, Plus, CalendarClock, type LucideIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useShift } from '../../hooks/useShift'
import { WORK_TYPES, SERVICE_TYPES, DELIVERY_KINDS, VISIT_TYPE_LABEL } from '../../domain/visitTypes'
import { registerGuestSchema, type RegisterGuestInput } from '../../domain/registerSchemas'
import { registerVisitor } from '../../services/visitorService'
import { registerDelivery } from '../../services/deliveryService'
import { bumpShiftCounter } from '../../services/shiftService'
import { sendVisitorNotification } from '../../services/NotificationService'
import { uploadPhoto } from '../../services/photoService'
import { TenantSearchField } from '../../components/gate/TenantSearchField'
import { PhotoCapture } from '../../components/ui/PhotoCapture'
import { IdScanConfirmDialog } from '../../components/gate/IdScanConfirmDialog'
import { Stepper } from '../../components/gate/Stepper'
import { VisitorPass } from '../../components/gate/VisitorPass'
import { Spinner } from '../../components/ui/LoadingScreen'
import type { VisitType, Tenant, PreApprovedVisitor } from '../../types'

type Visiting = { blockId: string; blockName: string; unitId: string; unitNumber: string; tenantId?: string; tenantName?: string; tenantPhone?: string }

type DoneResult = {
  id: string; name: string; type: VisitType; subtitle: string
  visiting: string; vehicle?: string; validUntil: string; arrival: string
  phone: string; idNumber?: string; duration?: string; qrValue: string; passId: string
}

const PURPOSES: { value: VisitType; icon: LucideIcon; label: string; hint: string }[] = [
  { value: 'FRIENDLY_VISIT',   icon: User,      label: 'Personal Visit',   hint: 'Visiting a resident personally' },
  { value: 'WORK',             icon: Wrench,    label: 'Work',             hint: 'Construction, maintenance, repair or other work' },
  { value: 'DELIVERY',         icon: Package,   label: 'Delivery',         hint: 'Food, parcels, courier or other deliveries' },
  { value: 'SERVICE_PROVIDER', icon: Briefcase, label: 'Service Provider', hint: 'Professional services or scheduled appointments' },
]

const STEP_HEADER: Record<VisitType, { icon: LucideIcon; title: string; subtitle: string }> = {
  FRIENDLY_VISIT:   { icon: User,      title: 'Visitor Details',  subtitle: 'Tell us who is visiting' },
  WORK:             { icon: Wrench,    title: 'Work Details',     subtitle: 'Provide the work information' },
  DELIVERY:         { icon: Package,   title: 'Delivery Details', subtitle: 'Provide the delivery information' },
  SERVICE_PROVIDER: { icon: Briefcase, title: 'Service Details',  subtitle: 'Provide the service information' },
}

const DURATIONS = [{ label: '1 hour', mins: 60 }, { label: '2 hours', mins: 120 }, { label: '4 hours', mins: 240 }]

/** Icon + label + control row used for every field in the details step. */
function Field({ icon: Icon, label, required, error, children }: {
  icon: LucideIcon; label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-[30px] text-gray-400 shrink-0"><Icon className="w-5 h-5" /></div>
      <div className="flex-1 min-w-0">
        <label className="label">{label}{required && ' *'}</label>
        {children}
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  )
}

export default function RegisterGuestPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const propertyId = user?.propertyId ?? ''
  const homePath = user?.role === 'CARETAKER' ? '/caretaker' : user?.role === 'PROPERTY_MANAGER' ? '/property' : '/gate'
  const actor = { uid: user?.uid ?? '', name: user?.profile?.name ?? 'Guard', role: 'SECURITY_GUARD' as const }
  const { shift } = useShift(user?.uid)

  const [step, setStep] = useState(1)
  const [visitType, setVisitType] = useState<VisitType | null>(null)
  const [visiting, setVisiting] = useState<Visiting | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [scanPhoto, setScanPhoto] = useState<Blob | null>(null)
  const [customDuration, setCustomDuration] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState<DoneResult | null>(null)
  const [view, setView] = useState<'success' | 'pass'>('success')

  const form = useForm<FieldValues>({ resolver: zodResolver(registerGuestSchema) as never })
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>

  const chooseType = (t: VisitType) => {
    setVisitType(t); setVisiting(null); setPhoto(null); setScanPhoto(null); setCustomDuration(false)
    form.reset({ visitType: t, nationality: 'Kenyan', numberOfVisitors: 1 } as never)
    setStep(2)
  }

  const applyTenant = (t: Tenant) => {
    setVisiting({ blockId: t.blockId, blockName: t.blockName, unitId: t.unitId, unitNumber: t.unitNumber, tenantId: t.tenantId, tenantName: t.fullName, tenantPhone: t.whatsappNumber || t.phoneNumber })
    form.setValue('blockId', t.blockId); form.setValue('unitId', t.unitId)
  }
  const applyPreApproved = (p: PreApprovedVisitor) => {
    setVisiting({ blockId: p.blockId ?? '', blockName: p.blockName ?? '', unitId: p.unitId, unitNumber: p.unitNumber, tenantId: p.tenantId, tenantName: p.tenantName })
    form.setValue('unitId', p.unitId); form.setValue('blockId', p.blockId || 'preapproved'); form.setValue('visitorName', p.name)
  }

  const goToReview = async () => {
    if (!visiting) { toast.error('Select who is being visited'); return }
    const ok = await form.trigger()
    if (!ok) { toast.error('Please complete the required fields'); return }
    setStep(3)
  }

  const visitingLabel = visiting ? `${visiting.blockName} ${visiting.unitNumber}${visiting.tenantName ? ` — ${visiting.tenantName}` : ''}` : ''

  const onSubmit = async (raw: FieldValues) => {
    const data = raw as RegisterGuestInput
    if (!propertyId || !visiting) { toast.error('Select who is being visited'); return }
    setSubmitting(true)
    try {
      let photoUrl: string | undefined
      if (photo) { try { photoUrl = await uploadPhoto(propertyId, data.visitType === 'DELIVERY' ? 'deliveries' : 'visitors', photo) } catch { toast('Photo upload skipped (offline)') } }

      let id: string
      if (data.visitType === 'DELIVERY') {
        id = await registerDelivery({
          propertyId, guard: actor, shiftId: shift?.shiftId,
          company: data.company, riderName: data.visitorName, riderPhone: data.phone, riderIdNumber: data.idNumber || undefined,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          deliveryType: data.deliveryType || undefined, trackingNumber: data.trackingNumber || undefined,
          vehicleRegistration: data.vehicleRegistration || undefined,
          packageDescription: data.packageDescription, photoUrl, notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'deliveriesRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'DELIVERY_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { unitNumber: visiting.unitNumber, company: data.company, riderName: data.visitorName, description: data.packageDescription ?? '' } })
      } else {
        id = await registerVisitor({
          propertyId, guard: actor, shiftId: shift?.shiftId, visitType: data.visitType,
          visitorName: data.visitorName, phone: data.phone, idNumber: data.idNumber || undefined, nationality: data.nationality || undefined, photoUrl,
          vehicleRegistration: data.vehicleRegistration || undefined,
          blockId: visiting.blockId, blockName: visiting.blockName, unitId: visiting.unitId, unitNumber: visiting.unitNumber,
          tenantId: visiting.tenantId, tenantName: visiting.tenantName,
          reason: data.visitType === 'FRIENDLY_VISIT' ? data.reason : undefined,
          numberOfVisitors: data.visitType === 'FRIENDLY_VISIT' ? data.numberOfVisitors : undefined,
          company: 'company' in data ? data.company : undefined,
          workType: data.visitType === 'WORK' ? data.workType : undefined,
          workDescription: data.visitType === 'WORK' ? data.workDescription : undefined,
          serviceType: data.visitType === 'SERVICE_PROVIDER' ? data.serviceType : undefined,
          serviceDescription: data.visitType === 'SERVICE_PROVIDER' ? data.serviceDescription : undefined,
          appointment: data.visitType === 'SERVICE_PROVIDER' ? data.appointment : undefined,
          expectedDurationMins: 'expectedDurationMins' in data ? data.expectedDurationMins : undefined,
          notes: data.notes,
        })
        await bumpShiftCounter(shift?.shiftId ?? '', 'visitorsRegistered')
        if (visiting.tenantPhone) await sendVisitorNotification({ propertyId, type: 'VISITOR_ALERT', recipientPhone: visiting.tenantPhone, recipientName: visiting.tenantName ?? '', relatedEntityId: id, data: { visitorName: data.visitorName, unitNumber: visiting.unitNumber, visitType: VISIT_TYPE_LABEL[data.visitType], reason: ('reason' in data ? data.reason : '') ?? '', idNumber: data.idNumber ?? '' } })
      }

      const now = new Date()
      const durationMins = 'expectedDurationMins' in data && data.expectedDurationMins ? data.expectedDurationMins : 480
      const validUntilDate = new Date(now.getTime() + durationMins * 60_000)
      const subtitle =
        data.visitType === 'WORK' ? `Work – ${data.workType}`
        : data.visitType === 'SERVICE_PROVIDER' ? data.serviceType
        : data.visitType === 'DELIVERY' ? `Delivery – ${data.company}`
        : 'Personal Visit'

      setDone({
        id, name: data.visitorName, type: data.visitType, subtitle,
        visiting: visitingLabel, vehicle: data.vehicleRegistration || undefined,
        phone: data.phone, idNumber: data.idNumber || undefined,
        arrival: format(now, 'h:mm a'),
        duration: 'expectedDurationMins' in data && data.expectedDurationMins ? `${Math.round(data.expectedDurationMins / 60)} hour${data.expectedDurationMins >= 120 ? 's' : ''}` : undefined,
        validUntil: format(validUntilDate, 'h:mm a • d MMM yyyy'),
        qrValue: `LANGO|${propertyId}|${id}|${validUntilDate.toISOString()}`,
        passId: `V#${id.slice(-4).toUpperCase()}`,
      })
      setView('success')
      toast.success('Guest registered')
    } catch (err) {
      console.error(err); toast.error('Unable to register guest. Check your connection and try again.')
    } finally { setSubmitting(false) }
  }

  const resetAll = () => { setDone(null); setStep(1); setVisitType(null); setVisiting(null); setPhoto(null); setScanPhoto(null); form.reset() }

  // ---- ID capture block shared by person-type steps ----
  const idBlock = (
    <>
      <Field icon={CreditCard} label="ID / Passport Number">
        <input className="input" {...form.register('idNumber')} />
      </Field>
      <div className="pl-8">
        <PhotoCapture label="Scan ID / passport (optional)" onCapture={blob => { setPhoto(blob); if (blob) setScanPhoto(blob) }} />
      </div>
      <IdScanConfirmDialog
        photo={scanPhoto}
        onClose={() => setScanPhoto(null)}
        onConfirm={fields => {
          if (fields.name) form.setValue('visitorName', fields.name)
          if (fields.idNumber) form.setValue('idNumber', fields.idNumber)
          setScanPhoto(null)
        }}
      />
    </>
  )

  const durationField = (
    <Field icon={Clock} label="Expected Duration">
      <div className="flex flex-wrap gap-2">
        {DURATIONS.map(d => {
          const active = !customDuration && form.watch('expectedDurationMins') === d.mins
          return (
            <button type="button" key={d.mins}
              onClick={() => { setCustomDuration(false); form.setValue('expectedDurationMins', d.mins) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${active ? 'bg-lango-primary/10 border-lango-primary text-lango-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {d.label}
            </button>
          )
        })}
        <button type="button" onClick={() => { setCustomDuration(true); form.setValue('expectedDurationMins', '') }}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${customDuration ? 'bg-lango-primary/10 border-lango-primary text-lango-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          Custom
        </button>
      </div>
      {customDuration && (
        <input className="input mt-2" inputMode="numeric" placeholder="Minutes" {...form.register('expectedDurationMins')} />
      )}
    </Field>
  )

  const clearVisiting = () => { setVisiting(null); form.setValue('unitId', ''); form.setValue('blockId', '') }

  const visitingField = (label: string) => (
    <Field icon={Home} label={label}>
      <TenantSearchField key={visitType} propertyId={propertyId} selectedUnitId={visiting?.unitId ?? null}
        onSelectTenant={applyTenant} onSelectPreApproved={applyPreApproved} onClear={clearVisiting} />
      {errors.unitId && <p className="form-error">{errors.unitId.message}</p>}
    </Field>
  )

  // =========================================================================
  // SUCCESS / PASS
  // =========================================================================
  if (done) {
    if (view === 'pass') {
      return (
        <div className="max-w-md mx-auto px-4 py-6 space-y-5">
          <VisitorPass
            passId={done.passId} propertyName="LANGO Gate" visitorName={done.name}
            subtitle={done.subtitle} validUntil={done.validUntil}
            visiting={done.visiting} vehicle={done.vehicle} qrValue={done.qrValue}
          />
          <button className="btn-primary w-full py-3" onClick={() => navigate(homePath)}>Done</button>
          <button className="btn-ghost w-full" onClick={() => setView('success')}>Back to summary</button>
        </div>
      )
    }
    const Head = STEP_HEADER[done.type].icon
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-lango-dark text-white text-center px-6 pt-12 pb-16 rounded-b-3xl">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
            <CheckCircle className="w-9 h-9 text-lango-primary" />
          </div>
          <h2 className="text-xl font-bold">Visitor Registered!</h2>
          <p className="text-white/60 text-sm mt-1">Access request created successfully.</p>
        </div>
        <div className="px-4 -mt-8 space-y-4 pb-8">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lango-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-lango-primary" /></div>
              <div><p className="font-semibold text-gray-900">{done.name}</p><p className="text-xs text-gray-500">{done.phone}{done.idNumber ? ` · ID: ${done.idNumber}` : ''}</p></div>
            </div>
            <div className="border-t border-gray-100" />
            <SummaryRow icon={Head} label="Visit Type" value={done.subtitle} />
            <SummaryRow icon={Home} label="Visiting" value={done.visiting} />
            {done.vehicle && <SummaryRow icon={Car} label="Vehicle" value={done.vehicle} />}
            <SummaryRow icon={Clock} label="Expected Arrival" value={done.arrival} />
            {done.duration && <SummaryRow icon={Clock} label="Expected Duration" value={done.duration} />}
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-lango-light border border-lango-primary/15 px-4 py-3 text-sm text-lango-secondary">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <p>The visitor will receive a temporary QR pass. Please share the details with the security guard.</p>
          </div>
          <button className="btn-primary w-full py-3" onClick={() => setView('pass')}>View Visitor Pass</button>
          <button className="btn-secondary w-full py-3" onClick={() => navigate(homePath)}>Done</button>
          <button className="btn-ghost w-full" onClick={resetAll}>Register Another Guest</button>
        </div>
      </div>
    )
  }

  // =========================================================================
  // STEP 1 — PURPOSE
  // =========================================================================
  if (step === 1) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="relative overflow-hidden bg-lango-dark text-white px-5 md:px-8 pt-5 pb-8 rounded-b-3xl">
          <Building2 className="absolute -right-6 -top-4 w-44 h-44 text-white/[0.06]" />
          <ShieldCheck className="absolute right-5 top-16 w-8 h-8 text-white/70" />
          <button onClick={() => navigate(homePath)} className="mb-6 text-white/80 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-2xl font-bold">Register a Guest</h1>
          <p className="text-white/60 text-sm mt-1">Step 1 of 3</p>
        </div>
        <div className="px-4 md:px-8 py-6 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">What is the purpose of this visit?</h3>
            <p className="text-sm text-gray-500">Select the type of visit to continue</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PURPOSES.map(o => (
              <button key={o.value} onClick={() => chooseType(o.value)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-200 bg-white hover:border-lango-primary hover:shadow-card transition-all text-left">
                <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
                  <o.icon className="w-5 h-5 text-lango-primary" />
                </div>
                <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900">{o.label}</p><p className="text-xs text-gray-500">{o.hint}</p></div>
                <ChevronRight className="w-5 h-5 text-gray-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // STEP 2 — DETAILS  &  STEP 3 — REVIEW  (shared shell)
  // =========================================================================
  const head = visitType ? STEP_HEADER[visitType] : null

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => (step === 2 ? (setStep(1), setVisitType(null)) : setStep(2))} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div><h1 className="page-title">{step === 3 ? 'Review & Register' : 'Register a Guest'}</h1><p className="page-subtitle">Step {step} of 3</p></div>
      </div>
      <Stepper current={step} />

      {step === 2 && head && visitType && (
        <form onSubmit={e => { e.preventDefault(); goToReview() }} className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lango-primary/10 flex items-center justify-center"><head.icon className="w-5 h-5 text-lango-primary" /></div>
            <div><h3 className="font-semibold text-gray-900">{head.title}</h3><p className="text-xs text-gray-500">{head.subtitle}</p></div>
          </div>

          <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
            {visitType === 'SERVICE_PROVIDER' && (
              <div className="md:col-span-2">
                <Field icon={Wrench} label="What service are you providing?" required error={errors.serviceType?.message}>
                  <input className="input" list="service-types" placeholder="e.g. Internet installation" {...form.register('serviceType')} />
                  <datalist id="service-types">{SERVICE_TYPES.map(s => <option key={s} value={s} />)}</datalist>
                </Field>
              </div>
            )}

            <Field icon={User} label={visitType === 'DELIVERY' ? "Delivery Person's Name" : 'Full Name'} required error={errors.visitorName?.message}>
              <input className="input" placeholder="e.g. John Kamau" {...form.register('visitorName')} />
            </Field>

            <Field icon={Phone} label="Phone Number" required error={errors.phone?.message}>
              <input className="input" inputMode="tel" placeholder="e.g. 0712 345 678" {...form.register('phone')} />
            </Field>

            {visitType !== 'DELIVERY' && <div className="md:col-span-2 space-y-3">{idBlock}</div>}

            {visitType === 'DELIVERY' ? (
              <Field icon={Building2} label="Company" required error={errors.company?.message}>
                <input className="input" placeholder="e.g. Uber Eats" {...form.register('company')} />
              </Field>
            ) : (
              <Field icon={Building2} label="Company / Organization">
                <input className="input" placeholder="Optional" {...form.register('company')} />
              </Field>
            )}

            {visitType === 'WORK' && (
              <Field icon={Wrench} label="Type of Work" required error={errors.workType?.message}>
                <select className="input" {...form.register('workType')}>
                  <option value="">Select work type</option>{WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </Field>
            )}

            {visitType === 'DELIVERY' && (<>
              <Field icon={Package} label="Delivery Type">
                <select className="input" {...form.register('deliveryType')}>
                  <option value="">Select delivery type</option>{DELIVERY_KINDS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field icon={Hash} label="Tracking / Order Number">
                <input className="input" placeholder="Optional" {...form.register('trackingNumber')} />
              </Field>
            </>)}

            {visitType === 'FRIENDLY_VISIT' && (
              <Field icon={Users} label="Number of Visitors">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => form.setValue('numberOfVisitors', Math.max(1, (Number(form.watch('numberOfVisitors')) || 1) - 1))} className="btn-secondary w-10 h-10 p-0"><Minus className="w-4 h-4" /></button>
                  <input className="input text-center w-16" inputMode="numeric" {...form.register('numberOfVisitors')} />
                  <button type="button" onClick={() => form.setValue('numberOfVisitors', (Number(form.watch('numberOfVisitors')) || 1) + 1)} className="btn-secondary w-10 h-10 p-0"><Plus className="w-4 h-4" /></button>
                </div>
              </Field>
            )}

            <div className="md:col-span-2">
              {visitingField(
                visitType === 'WORK' ? 'Who authorized your visit?'
                : visitType === 'DELIVERY' ? 'Delivering to'
                : 'Who are you visiting?',
              )}
            </div>

            {(visitType === 'DELIVERY' || visitType === 'SERVICE_PROVIDER' || visitType === 'FRIENDLY_VISIT') && (
              <Field icon={Car} label="Vehicle Registration">
                <input className="input" placeholder="Optional" {...form.register('vehicleRegistration')} />
              </Field>
            )}

            {(visitType === 'WORK' || visitType === 'SERVICE_PROVIDER') && <div className="md:col-span-2">{durationField}</div>}

            {visitType === 'SERVICE_PROVIDER' && (
              <div className="md:col-span-2">
                <Field icon={CalendarClock} label="Appointment">
                  <div className="flex gap-3">
                    {(['SCHEDULED', 'UNSCHEDULED'] as const).map(a => {
                      const active = form.watch('appointment') === a
                      return (
                        <button type="button" key={a} onClick={() => form.setValue('appointment', a)}
                          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium border capitalize transition-colors ${active ? 'bg-lango-primary/10 border-lango-primary text-lango-primary' : 'border-gray-200 text-gray-600'}`}>
                          {a.toLowerCase()}
                        </button>
                      )
                    })}
                  </div>
                </Field>
              </div>
            )}
          </div>

          <div className="flex md:justify-end">
            <button type="submit" className="btn-primary w-full md:w-auto md:px-10 py-3">Next <ArrowRight className="w-4 h-4" /></button>
          </div>
        </form>
      )}

      {step === 3 && visitType && (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 max-w-2xl mx-auto">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-lango-primary/10 flex items-center justify-center"><CheckCircle className="w-5 h-5 text-lango-primary" /></div>
              <div><h3 className="font-semibold text-gray-900">Review Visitor</h3><p className="text-xs text-gray-500">Please confirm the details before registering.</p></div>
            </div>
            <div className="border-t border-gray-100" />
            <ReviewRow icon={User} title="Visitor" lines={[form.watch('visitorName'), form.watch('phone'), form.watch('idNumber') ? `ID: ${form.watch('idNumber')}` : '']} />
            <ReviewRow icon={STEP_HEADER[visitType].icon} title="Visit Type" lines={[VISIT_TYPE_LABEL[visitType], visitType === 'WORK' ? form.watch('workType') : visitType === 'SERVICE_PROVIDER' ? form.watch('serviceType') : visitType === 'DELIVERY' ? form.watch('company') : (form.watch('reason') || '')]} />
            <ReviewRow icon={Home} title="Visiting" lines={[visitingLabel]} />
            {form.watch('vehicleRegistration') && <ReviewRow icon={Car} title="Vehicle" lines={[form.watch('vehicleRegistration')]} />}
            {form.watch('expectedDurationMins') && <ReviewRow icon={Clock} title="Expected Duration" lines={[`${Math.round(Number(form.watch('expectedDurationMins')) / 60)} hour(s)`]} />}
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting && <Spinner size="sm" className="text-white" />}{submitting ? 'Registering…' : 'Register Guest'}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={() => setStep(2)}>Back</button>
        </form>
      )}
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="w-5 h-5 text-lango-primary shrink-0" />
      <div className="flex-1 min-w-0"><p className="text-xs text-gray-500">{label}</p><p className="text-sm font-medium text-gray-900 truncate">{value}</p></div>
    </div>
  )
}

function ReviewRow({ icon: Icon, title, lines }: { icon: LucideIcon; title: string; lines: (string | undefined)[] }) {
  const shown = lines.filter(Boolean) as string[]
  return (
    <div className="flex gap-3">
      <Icon className="w-5 h-5 text-lango-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{title}</p>
        {shown.map((l, i) => <p key={i} className={`text-sm ${i === 0 ? 'font-medium text-gray-900' : 'text-gray-600'} truncate`}>{l}</p>)}
      </div>
    </div>
  )
}
