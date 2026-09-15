import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, collection, writeBatch, serverTimestamp, getDoc, increment } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'
import { db } from '../../firebase/config'
import { Spinner } from '../../components/ui/LoadingScreen'
import { generateUnitCodes, generateFloorUnitCodes } from '../../utils/units'
import toast from 'react-hot-toast'

const schema = z.object({
  name:        z.string().min(1, 'Block name is required'),
  prefix:      z.string().min(1, 'Prefix is required').max(3, 'Max 3 characters'),
  description: z.string().optional(),
  autoGenerateUnits: z.boolean(),
  genMode:     z.enum(['count', 'floors']),
  totalUnits:  z.number({ message: 'Number of units required' }).min(0).max(500),
  floors:      z.number({ message: 'Floors required' }).min(0).max(60),
  unitsPerFloor: z.number({ message: 'Units per floor required' }).min(0).max(100),
}).refine(
  (d) => !d.autoGenerateUnits || d.genMode !== 'floors' || d.floors * d.unitsPerFloor <= 500,
  { message: 'Floors × units per floor cannot exceed 500', path: ['unitsPerFloor'] },
)
type FormData = z.infer<typeof schema>

export default function BlockFormPage() {
  const { id: propertyId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', prefix: '', description: '',
      autoGenerateUnits: true, genMode: 'floors',
      totalUnits: 0, floors: 1, unitsPerFloor: 1,
    },
  })

  const auto = watch('autoGenerateUnits')
  const genMode = watch('genMode')
  const count = watch('totalUnits')
  const floors = watch('floors')
  const unitsPerFloor = watch('unitsPerFloor')
  const prefix = watch('prefix')
  const prefixUp = prefix.trim().toUpperCase()

  const onSubmit = async (data: FormData) => {
    if (!propertyId) return
    setSaving(true)
    try {
      const propSnap = await getDoc(doc(db, 'properties', propertyId))
      if (!propSnap.exists()) { toast.error('Property not found'); return }

      const batch = writeBatch(db)
      const blockRef = doc(collection(db, 'blocks'))
      const prefixUpper = data.prefix.trim().toUpperCase()

      const units = !data.autoGenerateUnits
        ? []
        : (data.genMode === 'floors'
            ? generateFloorUnitCodes({
                prefix: prefixUpper,
                floors: data.floors,
                unitsPerFloor: data.unitsPerFloor,
              }).map((u) => ({ unitNumber: u.unitNumber, floor: u.floor as string | null }))
            : generateUnitCodes({
                prefix: prefixUpper,
                start: 1,
                count: data.totalUnits,
                padding: Math.max(2, String(Math.max(data.totalUnits, 1)).length),
              }).map((unitNumber) => ({ unitNumber, floor: null as string | null }))
          ).slice(0, 500)
      const unitsCreated = units.length

      batch.set(blockRef, {
        blockId: blockRef.id,
        propertyId,
        name: data.name,
        prefix: prefixUpper,
        description: data.description ?? '',
        totalUnits: unitsCreated,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      for (const { unitNumber, floor } of units) {
        const unitRef = doc(collection(db, 'units'))
        batch.set(unitRef, {
          unitId: unitRef.id,
          propertyId,
          blockId: blockRef.id,
          blockName: data.name,
          unitNumber,
          displayName: unitNumber,
          floor,
          unitType: null,
          status: 'VACANT',
          currentTenantId: null,
          currentTenantName: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
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

  const flatPreview = auto && genMode === 'count' && count > 0
    ? generateUnitCodes({
        prefix: prefixUp,
        start: 1,
        count: Math.min(count, 500),
        padding: Math.max(2, String(Math.min(count, 500)).length),
      }).map((unitNumber) => ({ unitNumber, floor: null as string | null }))
    : []

  const floorPreview = auto && genMode === 'floors' && floors > 0 && unitsPerFloor > 0
    ? generateFloorUnitCodes({ prefix: prefixUp, floors, unitsPerFloor })
        .slice(0, 500)
        .map((u) => ({ unitNumber: u.unitNumber, floor: u.floor as string | null }))
    : []

  const generated = genMode === 'floors' ? floorPreview : flatPreview

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
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['floors', 'count'] as const).map((m) => (
                <label key={m} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm text-center ${genMode === m ? 'border-lango-primary bg-blue-50 text-lango-primary font-medium' : 'border-gray-200 text-gray-600'}`}>
                  <input type="radio" value={m} {...register('genMode')} className="sr-only" />
                  {m === 'floors' ? 'By floor' : 'Flat count'}
                </label>
              ))}
            </div>

            {genMode === 'floors' ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Floors *</label>
                  <input {...register('floors', { valueAsNumber: true })} type="number" min={1} max={60} className="input" />
                  {errors.floors && <p className="form-error">{errors.floors.message}</p>}
                </div>
                <div>
                  <label className="label">Units per floor *</label>
                  <input {...register('unitsPerFloor', { valueAsNumber: true })} type="number" min={1} max={100} className="input" />
                  {errors.unitsPerFloor && <p className="form-error">{errors.unitsPerFloor.message}</p>}
                </div>
              </div>
            ) : (
              <div>
                <label className="label">Number of Units *</label>
                <input {...register('totalUnits', { valueAsNumber: true })} type="number" min={0} max={500} className="input" />
                {errors.totalUnits && <p className="form-error">{errors.totalUnits.message}</p>}
              </div>
            )}

            {generated.length > 0 && (
              <p className="text-xs text-gray-500">
                Will create <span className="font-medium">{generated.length}</span> units
                {genMode === 'floors' ? ` across ${floors} floor${floors === 1 ? '' : 's'}` : ''}:{' '}
                <span className="font-medium">{generated.slice(0, 4).map((u) => u.unitNumber).join(', ')}
                {generated.length > 4 ? ` … ${generated[generated.length - 1].unitNumber}` : ''}</span>
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
