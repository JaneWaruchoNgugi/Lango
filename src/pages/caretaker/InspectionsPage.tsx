import { useEffect, useState } from 'react'
import { getDocs, query, where, orderBy, addDoc, serverTimestamp, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { PageLoader, Spinner } from '../../components/ui/LoadingScreen'
import { Modal } from '../../components/ui/Modal'
import { ClipboardList, Plus, ChevronDown, ChevronUp, Printer } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { UnitInspection, InspectionType, InspectionCondition, InspectionItem } from '../../types'

const CHECKLIST_ITEMS: string[] = [
  'Walls', 'Flooring', 'Ceiling', 'Plumbing / Taps', 'Electrical / Switches',
  'Windows / Doors', 'Kitchen', 'Bathroom', 'Appliances', 'General Cleanliness',
]
const CONDITIONS: InspectionCondition[] = ['GOOD', 'FAIR', 'POOR', 'NA']

const schema = z.object({
  unitNumber:  z.string().min(1, 'Unit required'),
  tenantName:  z.string().optional(),
  type:        z.enum(['MOVE_IN', 'MOVE_OUT', 'ROUTINE']),
  overallNotes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const CONDITION_COLOR: Record<InspectionCondition, string> = {
  GOOD: 'text-green-600 bg-green-50',
  FAIR: 'text-yellow-600 bg-yellow-50',
  POOR: 'text-red-600 bg-red-50',
  NA:   'text-gray-400 bg-gray-50',
}

export default function InspectionsPage() {
  const { user } = useAuth()
  const pid = user?.propertyId ?? ''

  const [inspections, setInspections] = useState<UnitInspection[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [step,        setStep]        = useState<1 | 2 | 3>(1)
  const [conditions,  setConditions]  = useState<Record<string, InspectionCondition>>({})
  const [itemNotes,   setItemNotes]   = useState<Record<string, string>>({})

  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'ROUTINE' },
  })

  const load = () => {
    if (!pid) { setLoading(false); return }
    getDocs(query(collection(db, 'inspections'), where('propertyId', '==', pid), orderBy('createdAt', 'desc')))
      .then(snap => setInspections(snap.docs.map(d => ({ ...d.data(), id: d.id } as UnitInspection))))
      .catch(e => console.error('[Inspections]', e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [pid])

  const startNew = () => {
    reset({ type: 'ROUTINE' })
    setConditions(Object.fromEntries(CHECKLIST_ITEMS.map(k => [k, 'GOOD' as InspectionCondition])))
    setItemNotes({})
    setStep(1)
    setShowAdd(true)
  }

  const nextStep = async () => {
    if (step === 1) {
      await handleSubmit(() => {})()
      const vals = getValues()
      if (!vals.unitNumber) { toast.error('Enter unit number'); return }
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const onSubmit = async (data: FormData) => {
    setSaving(true)
    try {
      const items: InspectionItem[] = CHECKLIST_ITEMS.map(label => ({
        label,
        condition: conditions[label] ?? 'GOOD',
        notes: itemNotes[label] || undefined,
      }))
      await addDoc(collection(db, 'inspections'), {
        propertyId:       pid,
        unitNumber:       data.unitNumber,
        tenantName:       data.tenantName || null,
        type:             data.type,
        items,
        overallNotes:     data.overallNotes || null,
        conductedBy:      user?.uid ?? '',
        conductedByName:  user?.profile?.name ?? '',
        createdAt:        serverTimestamp(),
      })
      toast.success('Inspection saved')
      setShowAdd(false)
      reset()
      load()
    } catch (e) { console.error(e); toast.error('Could not save') } finally { setSaving(false) }
  }

  const printInspection = (ins: UnitInspection) => {
    const lines = [
      'LANGO PROPERTY INSPECTION REPORT',
      '=================================',
      `Unit: ${ins.unitNumber}`,
      `Tenant: ${ins.tenantName ?? 'N/A'}`,
      `Type: ${ins.type.replace('_', ' ')}`,
      `Date: ${format(ins.createdAt.toDate(), 'd MMMM yyyy')}`,
      `Conducted by: ${ins.conductedByName}`,
      '',
      'CHECKLIST',
      '---------',
      ...ins.items.map(i => `${i.label.padEnd(30)} ${i.condition}${i.notes ? ` — ${i.notes}` : ''}`),
      '',
      ins.overallNotes ? `Notes: ${ins.overallNotes}` : '',
    ].filter(l => l !== undefined)

    const w = window.open('', '_blank')
    if (!w) return
    const pre = w.document.createElement('pre')
    pre.style.fontFamily = 'monospace'
    pre.style.padding = '2rem'
    pre.textContent = lines.join('\n')
    w.document.body.appendChild(pre)
    w.print()
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-lango-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Unit Inspections</h1>
            <p className="text-sm text-gray-500">{inspections.length} inspection{inspections.length !== 1 ? 's' : ''} recorded</p>
          </div>
        </div>
        <button className="btn-primary" onClick={startNew}>
          <Plus className="w-4 h-4" /> New Inspection
        </button>
      </div>

      {inspections.length === 0 ? (
        <div className="card p-10 text-center">
          <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No inspections recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {inspections.map(ins => (
            <div key={ins.id} className="card overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer select-none"
                onClick={() => setExpanded(expanded === ins.id ? null : ins.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">Unit {ins.unitNumber}</p>
                      <span className="badge badge-gray text-xs">{ins.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(ins.createdAt.toDate(), 'd MMM yyyy')} · {ins.conductedByName}
                      {ins.tenantName ? ` · ${ins.tenantName}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={e => { e.stopPropagation(); printInspection(ins) }}
                    className="text-gray-400 hover:text-gray-700 p-1" title="Print">
                    <Printer className="w-4 h-4" />
                  </button>
                  {expanded === ins.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {expanded === ins.id && (
                <div className="border-t border-gray-100 p-4">
                  <div className="space-y-1.5">
                    {ins.items.map(item => (
                      <div key={item.label} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CONDITION_COLOR[item.condition]}`}>
                            {item.condition}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {ins.overallNotes && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      <span className="font-medium">Notes: </span>{ins.overallNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Multi-step modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}
        title={step === 1 ? 'New Inspection — Details' : step === 2 ? 'Inspection Checklist' : 'Review & Save'}
        size={step === 2 ? 'lg' : 'sm'}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-400">Step {step} of 3</span>
            <div className="flex gap-2">
              {step > 1 && <button onClick={() => setStep(s => (s - 1) as typeof step)} className="btn-secondary" disabled={saving}>Back</button>}
              {step < 3
                ? <button onClick={nextStep} className="btn-primary">Next</button>
                : (
                  <button onClick={handleSubmit(onSubmit)} className="btn-primary" disabled={saving}>
                    {saving && <Spinner size="sm" className="text-white" />} Save Inspection
                  </button>
                )
              }
            </div>
          </div>
        }
      >
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="label">Unit Number *</label>
              <input {...register('unitNumber')} className="input" placeholder="e.g. A03" />
              {errors.unitNumber && <p className="form-error">{errors.unitNumber.message}</p>}
            </div>
            <div>
              <label className="label">Tenant Name</label>
              <input {...register('tenantName')} className="input" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Inspection Type *</label>
              <select {...register('type')} className="input">
                {(['MOVE_IN', 'MOVE_OUT', 'ROUTINE'] as InspectionType[]).map(t => (
                  <option key={t} value={t}>{t.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <div key={item} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-700 flex-1">{item}</span>
                <div className="flex gap-1">
                  {CONDITIONS.map(c => (
                    <button key={c} type="button"
                      onClick={() => setConditions(prev => ({ ...prev, [item]: c }))}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${conditions[item] === c
                        ? `${CONDITION_COLOR[c]} border-current`
                        : 'bg-white border-gray-200 text-gray-400'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span className="font-medium">Unit {getValues('unitNumber')}</span> — {getValues('type').replace('_', ' ')}
            </p>
            <div className="space-y-1 text-xs">
              {CHECKLIST_ITEMS.map(item => (
                <div key={item} className="flex justify-between">
                  <span className="text-gray-600">{item}</span>
                  <span className={`font-medium ${conditions[item] === 'POOR' ? 'text-red-600' : conditions[item] === 'FAIR' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {conditions[item]}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <label className="label">Overall Notes</label>
              <textarea {...register('overallNotes')} className="input resize-none" rows={2} placeholder="Any additional observations…" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
