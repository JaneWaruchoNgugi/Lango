import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, collection, writeBatch, serverTimestamp, getDoc, increment } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'
import { db } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { generateUnitCodes } from '../../utils/units'
import toast from 'react-hot-toast'

const schema = z.object({
  name:        z.string().min(1, 'Block name is required'),
  prefix:      z.string().min(1, 'Prefix is required').max(3, 'Max 3 characters'),
  description: z.string().optional(),
  totalUnits:  z.number({ message: 'Number of units required' }).min(0).max(500),
  autoGenerateUnits: z.boolean(),
})
type FormData = z.infer<typeof schema>

export default function BlockFormPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', prefix: '', totalUnits: 0, autoGenerateUnits: true },
  })

  const auto = watch('autoGenerateUnits')
  const count = watch('totalUnits')
  const prefix = watch('prefix')

  const onSubmit = async (data: FormData) => {
    if (!propertyId) return
    setSaving(true)
    try {
      const propSnap = await getDoc(doc(db, 'properties', propertyId))
      if (!propSnap.exists()) { toast.error('Property not found'); return }

      const batch = writeBatch(db)
      const blockRef = doc(collection(db, 'blocks'))
      batch.set(blockRef, {
        blockId: blockRef.id,
        propertyId,
        name: data.name,
        prefix: data.prefix.trim().toUpperCase(),
        description: data.description ?? '',
        totalUnits: data.autoGenerateUnits ? data.totalUnits : 0,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      let unitsCreated = 0
      if (data.autoGenerateUnits && data.totalUnits > 0) {
        const numbers = generateUnitCodes({
          prefix: data.prefix.trim().toUpperCase(),
          start: 1,
          count: data.totalUnits,
          padding: Math.max(2, String(Math.max(data.totalUnits, 1)).length),
        })
        for (const unitNumber of numbers) {
          const unitRef = doc(collection(db, 'units'))
          batch.set(unitRef, {
            unitId: unitRef.id,
            propertyId,
            blockId: blockRef.id,
            blockName: data.name,
            unitNumber,
            displayName: unitNumber,
            floor: null,
            unitType: null,
            status: 'VACANT',
            currentTenantId: null,
            currentTenantName: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
        unitsCreated = numbers.length
      }

      batch.update(doc(db, 'properties', propertyId), {
        numberOfBlocks: increment(1),
        totalUnits: increment(unitsCreated),
        updatedAt: serverTimestamp(),
      })

      await batch.commit()
      toast.success(`Block "${data.name}" created${unitsCreated ? ` with ${unitsCreated} units` : ''}`)
      navigate(`/admin/properties/${propertyId}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to create block')
    } finally {
      setSaving(false)
    }
  }

  const preview = auto && count > 0
    ? generateUnitCodes({
        prefix: prefix.trim().toUpperCase(),
        start: 1,
        count: Math.min(count, 500),
        padding: Math.max(2, String(Math.min(count, 500)).length),
      })
    : []

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div>
          <h1 className="page-title">Add Block</h1>
          <p className="page-subtitle">Create a block and optionally auto-generate its units</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Block Name *</label>
            <input {...register('name')} className="input" placeholder="e.g. Block A" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Unit Prefix *</label>
            <input {...register('prefix')} className="input" placeholder="e.g. A" />
            {errors.prefix && <p className="form-error">{errors.prefix.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <input {...register('description')} className="input" placeholder="Optional" />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('autoGenerateUnits')} className="rounded border-gray-300" />
          Auto-generate units
        </label>

        {auto && (
          <div>
            <label className="label">Number of Units *</label>
            <input {...register('totalUnits', { valueAsNumber: true })} type="number" min={0} max={500} className="input" />
            {errors.totalUnits && <p className="form-error">{errors.totalUnits.message}</p>}
            {preview.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Will create: <span className="font-medium">{preview.slice(0, 4).join(', ')}
                {preview.length > 4 ? ` … ${preview[preview.length - 1]}` : ''}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving && <Spinner size="sm" className="text-white" />}
            Create Block
          </button>
        </div>
      </form>
    </div>
  )
}
