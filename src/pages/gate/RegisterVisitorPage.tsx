import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  collection, query, where, getDocs, addDoc,
  updateDoc, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, ArrowRight, CheckCircle, User, MapPin, FileText } from 'lucide-react'
import { Spinner } from '../../components/ui/LoadingScreen'
import type { Block, Unit, Tenant, VisitType } from '../../types'
import { sendMockWhatsApp } from '../../services/NotificationService'
import toast from 'react-hot-toast'

const steps = ['Visitor Details', 'Select Unit', 'Visit Reason']

const step1Schema = z.object({
  visitorName:  z.string().min(2, 'Name is required'),
  idNumber:     z.string().min(5, 'ID number is required'),
  nationality:  z.string().min(2, 'Nationality is required'),
  phone:        z.string().min(9, 'Phone is required'),
  visitType:    z.enum(['FRIENDLY_VISIT','WORK','DELIVERY','SERVICE_PROVIDER']),
})

const step2Schema = z.object({
  blockId: z.string().min(1, 'Select a block'),
  unitId:  z.string().min(1, 'Select a unit'),
})

const step3Schema = z.object({
  reason: z.string().min(3, 'Reason is required'),
  notes:  z.string().optional(),
})

type Step1 = z.infer<typeof step1Schema>
type Step2 = z.infer<typeof step2Schema>
type Step3 = z.infer<typeof step3Schema>

const VISIT_TYPES: { value: VisitType; label: string; emoji: string }[] = [
  { value: 'FRIENDLY_VISIT',   label: 'Friendly Visit',   emoji: '👤' },
  { value: 'WORK',             label: 'Work',             emoji: '🔧' },
  { value: 'DELIVERY',         label: 'Delivery',         emoji: '📦' },
  { value: 'SERVICE_PROVIDER', label: 'Service Provider', emoji: '🛠️' },
]

export default function RegisterVisitorPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const [step, setStep]       = useState(0)
  const [step1Data, setStep1Data] = useState<Step1 | null>(null)
  const [step2Data, setStep2Data] = useState<Step2 | null>(null)
  const [blocks, setBlocks]   = useState<Block[]>([])
  const [units, setUnits]     = useState<Unit[]>([])
  const [tenant, setTenant]   = useState<Tenant | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]       = useState(false)

  const propertyId = user?.propertyId ?? ''
  const guardId    = user?.uid ?? ''

  const form1 = useForm<Step1>({ resolver: zodResolver(step1Schema), defaultValues: { visitType: 'FRIENDLY_VISIT', nationality: 'Kenyan' } })
  const form2 = useForm<Step2>({ resolver: zodResolver(step2Schema) })
  const form3 = useForm<Step3>({ resolver: zodResolver(step3Schema) })

  useEffect(() => {
    if (!propertyId) return
    getDocs(query(collection(db, 'blocks'), where('propertyId', '==', propertyId), orderBy('name')))
      .then(snap => setBlocks(snap.docs.map(d => d.data() as Block)))
      .catch(console.error)
  }, [propertyId])

  const selectedBlock = form2.watch('blockId')
  const selectedUnit  = form2.watch('unitId')

  useEffect(() => {
    if (!selectedBlock) { setUnits([]); return }
    getDocs(query(
      collection(db, 'units'),
      where('propertyId', '==', propertyId),
      where('blockId', '==', selectedBlock),
      orderBy('unitNumber')
    )).then(snap => setUnits(snap.docs.map(d => d.data() as Unit))).catch(console.error)
  }, [selectedBlock, propertyId])

  useEffect(() => {
    if (!selectedUnit) { setTenant(null); return }
    const unit = units.find(u => u.unitId === selectedUnit)
    if (!unit?.currentTenantId) { setTenant(null); return }
    getDocs(query(collection(db, 'tenants'), where('unitId', '==', selectedUnit)))
      .then(snap => {
        if (!snap.empty) setTenant(snap.docs[0].data() as Tenant)
        else setTenant(null)
      }).catch(console.error)
  }, [selectedUnit, units])

  const onStep1 = (data: Step1) => { setStep1Data(data); setStep(1) }
  const onStep2 = (data: Step2) => { setStep2Data(data); setStep(2) }

  const onStep3 = async (data: Step3) => {
    if (!step1Data || !step2Data) return
    setSubmitting(true)
    try {
      const unit  = units.find(u => u.unitId === step2Data.unitId)
      const block = blocks.find(b => b.blockId === step2Data.blockId)

      const visitorRef = await addDoc(collection(db, 'visitors'), {
        visitorId: '',
        propertyId,
        blockId:       step2Data.blockId,
        unitId:        step2Data.unitId,
        unitNumber:    unit?.unitNumber ?? '',
        blockName:     block?.name ?? '',
        tenantId:      tenant?.tenantId ?? '',
        tenantName:    tenant?.fullName ?? '',
        guardId,
        guardName:     user?.profile?.name ?? 'Guard',
        registeredBy:  guardId,
        registeredByRole: 'SECURITY_GUARD' as const,
        visitorName:   step1Data.visitorName,
        idNumber:      step1Data.idNumber,
        nationality:   step1Data.nationality,
        phone:         step1Data.phone,
        visitType:     step1Data.visitType,
        reason:        data.reason,
        notes:         data.notes ?? '',
        status:        'INSIDE',
        checkInTime:   serverTimestamp(),
        checkOutTime:  null,
        notificationSent: false,
        createdAt:     serverTimestamp(),
        updatedAt:     serverTimestamp(),
      })
      await updateDoc(visitorRef, { visitorId: visitorRef.id })

      // Send WhatsApp notification (mock in dev)
      if (tenant?.whatsappNumber) {
        await sendMockWhatsApp({
          to:      tenant.whatsappNumber,
          type:    'VISITOR_ALERT',
          data: {
            tenantName:  tenant.fullName,
            visitorName: step1Data.visitorName,
            unitNumber:  unit?.unitNumber ?? '',
            visitType:   step1Data.visitType,
            reason:      data.reason,
            idNumber:    step1Data.idNumber,
          }
        })
        await updateDoc(visitorRef, { notificationSent: true })
      }

      setDone(true)
      toast.success('Visitor registered successfully')
    } catch (err) {
      console.error(err)
      toast.error('Failed to register visitor')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="max-w-sm mx-auto px-4 py-12 text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-2">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Visitor Registered</h2>
        <p className="text-gray-500 text-sm">
          {step1Data?.visitorName} has been logged.{tenant ? ' The tenant has been notified.' : ''}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={() => { setDone(false); setStep(0); form1.reset(); form2.reset(); form3.reset(); setStep1Data(null); setStep2Data(null); setTenant(null) }}
            className="btn-primary w-full py-3"
          >
            Register Another Visitor
          </button>
          <button onClick={() => navigate('/gate')} className="btn-secondary w-full py-3">
            Back to Gate
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => step === 0 ? navigate('/gate') : setStep(s => s - 1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">Register Visitor</h1>
          <p className="page-subtitle">Step {step + 1} of {steps.length}: {steps[step]}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-lango-primary' : 'bg-gray-200'}`} />
        ))}
      </div>

      {/* Step 1 — Visitor details */}
      {step === 0 && (
        <form onSubmit={form1.handleSubmit(onStep1)} className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-lango-primary" />
              <h3 className="text-sm font-semibold">Visitor Information</h3>
            </div>
            <div>
              <label className="label">Full Name *</label>
              <input {...form1.register('visitorName')} className="input" placeholder="e.g. John Mwangi" autoFocus />
              {form1.formState.errors.visitorName && <p className="form-error">{form1.formState.errors.visitorName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">ID / Passport *</label>
                <input {...form1.register('idNumber')} className="input" placeholder="12345678" inputMode="numeric" />
                {form1.formState.errors.idNumber && <p className="form-error">{form1.formState.errors.idNumber.message}</p>}
              </div>
              <div>
                <label className="label">Nationality *</label>
                <input {...form1.register('nationality')} className="input" placeholder="Kenyan" />
              </div>
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input {...form1.register('phone')} className="input" placeholder="0712345678" inputMode="tel" />
              {form1.formState.errors.phone && <p className="form-error">{form1.formState.errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Visit Type *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {VISIT_TYPES.map(vt => (
                  <label
                    key={vt.value}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      form1.watch('visitType') === vt.value
                        ? 'border-lango-primary bg-lango-light'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input {...form1.register('visitType')} type="radio" value={vt.value} className="sr-only" />
                    <span className="text-lg">{vt.emoji}</span>
                    <span className="text-xs font-medium text-gray-700">{vt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 2 — Select unit */}
      {step === 1 && (
        <form onSubmit={form2.handleSubmit(onStep2)} className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-lango-primary" />
              <h3 className="text-sm font-semibold">Select Unit & Tenant</h3>
            </div>
            <div>
              <label className="label">Block *</label>
              <select {...form2.register('blockId')} className="input">
                <option value="">Select block...</option>
                {blocks.map(b => (
                  <option key={b.blockId} value={b.blockId}>{b.name}</option>
                ))}
              </select>
              {form2.formState.errors.blockId && <p className="form-error">{form2.formState.errors.blockId.message}</p>}
            </div>
            <div>
              <label className="label">Unit *</label>
              <select {...form2.register('unitId')} className="input" disabled={!selectedBlock}>
                <option value="">Select unit...</option>
                {units.map(u => (
                  <option key={u.unitId} value={u.unitId}>
                    {u.unitNumber} {u.currentTenantName ? `— ${u.currentTenantName}` : '(Vacant)'}
                  </option>
                ))}
              </select>
              {form2.formState.errors.unitId && <p className="form-error">{form2.formState.errors.unitId.message}</p>}
            </div>

            {/* Tenant preview */}
            {tenant && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs font-semibold text-green-800 mb-1">✓ Tenant Found</p>
                <p className="text-sm font-medium text-gray-900">{tenant.fullName}</p>
                <p className="text-xs text-gray-600">{tenant.whatsappNumber || tenant.phoneNumber}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {tenant.whatsappNumber
                    ? '📱 WhatsApp notification will be sent'
                    : '⚠️ No WhatsApp number — no notification'}
                </p>
              </div>
            )}
            {selectedUnit && !tenant && (
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-xs text-yellow-800">⚠️ No tenant registered for this unit. Visit will still be logged.</p>
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary w-full py-3">
            Next <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* Step 3 — Reason */}
      {step === 2 && (
        <form onSubmit={form3.handleSubmit(onStep3)} className="space-y-4">
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-4 h-4 text-lango-primary" />
              <h3 className="text-sm font-semibold">Purpose of Visit</h3>
            </div>
            {/* Summary */}
            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
              <p className="text-xs text-gray-500">Visitor: <span className="font-medium text-gray-800">{step1Data?.visitorName}</span></p>
              <p className="text-xs text-gray-500">Unit: <span className="font-medium text-gray-800">
                {units.find(u => u.unitId === step2Data?.unitId)?.unitNumber}
                {tenant ? ` — ${tenant.fullName}` : ''}
              </span></p>
            </div>
            <div>
              <label className="label">Reason for Visit *</label>
              <input {...form3.register('reason')} className="input" placeholder="e.g. Personal visit, plumbing repair..." />
              {form3.formState.errors.reason && <p className="form-error">{form3.formState.errors.reason.message}</p>}
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea {...form3.register('notes')} rows={2} className="input resize-none" placeholder="Any additional notes..." />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full py-3">
            {submitting && <Spinner size="sm" className="text-white" />}
            {submitting ? 'Registering...' : 'Register Visitor'}
          </button>
        </form>
      )}
    </div>
  )
}
