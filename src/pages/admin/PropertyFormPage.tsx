import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { doc, collection, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '../../components/ui/LoadingScreen'
import toast from 'react-hot-toast'
import { useEffect, useState } from 'react'
import type { Property } from '../../types'

const schema = z.object({
  name:           z.string().min(2, 'Property name is required'),
  type:           z.enum(['APARTMENT_BLOCK','GATED_ESTATE','MIXED_USE','SERVICED_APARTMENTS','OTHER']),
  address:        z.string().min(5, 'Address is required'),
  county:         z.string().min(2, 'County is required'),
  city:           z.string().min(2, 'City/Town is required'),
  structureType:  z.enum(['BLOCKS', 'SINGLE_BUILDING', 'VILLAS', 'CUSTOM']),
  primaryContact: z.string().min(2, 'Contact name is required'),
  phone:          z.string().min(9, 'Valid phone number required'),
  email:          z.string().email('Valid email required'),
  plan:           z.enum(['SMALL','MEDIUM','LARGE','ESTATE']),
  status:         z.enum(['ACTIVE','TRIAL','SUSPENDED','ARCHIVED']),
})

type FormData = z.infer<typeof schema>

export default function PropertyFormPage() {
  const { user }  = useAuth()
  const navigate   = useNavigate()
  const { id }     = useParams()
  const isEdit     = Boolean(id && id !== 'new')
  const [loading, setLoading] = useState(isEdit)

  const {
    register, handleSubmit, reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'TRIAL', plan: 'SMALL', type: 'APARTMENT_BLOCK', structureType: 'BLOCKS' },
  })

  useEffect(() => {
    if (!isEdit) return
    getDoc(doc(db, 'properties', id!)).then(snap => {
      if (snap.exists()) {
        const data = snap.data() as Property
        reset({
          name: data.name, type: data.type, address: data.address,
          county: data.county, city: data.city,
          structureType: data.structureType ?? 'BLOCKS',
          primaryContact: data.primaryContact, phone: data.phone,
          email: data.email, plan: data.plan, status: data.status,
        })
      }
    }).finally(() => setLoading(false))
  }, [isEdit, id, reset])

  const onSubmit = async (data: FormData) => {
    try {
      const propertyId = isEdit ? id! : doc(collection(db, 'properties')).id
      const payload = {
        ...data,
        propertyId,
        updatedAt: serverTimestamp(),
        ...(isEdit ? {} : {
          createdAt:  serverTimestamp(),
          createdBy:  user!.uid,
          occupiedUnits: 0,
        }),
      }
      if (isEdit) {
        await updateDoc(doc(db, 'properties', propertyId), payload)
        toast.success('Property updated')
      } else {
        await setDoc(doc(db, 'properties', propertyId), payload)
        toast.success('Property created')
      }
      navigate(`/admin/properties/${propertyId}`)
    } catch (err) {
      console.error(err)
      toast.error('Failed to save property')
    }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Property' : 'Add New Property'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update property details' : 'Create a new property on the Lango platform'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Basic info */}
        <div>
          <h3 className="section-title">Basic Information</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Property Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Greenview Apartments" />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Property Type *</label>
              <select {...register('type')} className="input">
                <option value="APARTMENT_BLOCK">Apartment Block</option>
                <option value="GATED_ESTATE">Gated Estate</option>
                <option value="MIXED_USE">Mixed Use</option>
                <option value="SERVICED_APARTMENTS">Serviced Apartments</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Status *</label>
              <select {...register('status')} className="input">
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">How is this property organized? *</label>
              <select {...register('structureType')} className="input">
                <option value="BLOCKS">Blocks &amp; Buildings</option>
                <option value="SINGLE_BUILDING">Single Building</option>
                <option value="VILLAS">Villas / Individual Units</option>
                <option value="CUSTOM">Custom</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">You'll add buildings and units after creating the property.</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <h3 className="section-title">Location</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Address *</label>
              <input {...register('address')} className="input" placeholder="e.g. Off Kiambu Road, Ruaka" />
              {errors.address && <p className="form-error">{errors.address.message}</p>}
            </div>
            <div>
              <label className="label">County *</label>
              <input {...register('county')} className="input" placeholder="e.g. Nairobi" />
              {errors.county && <p className="form-error">{errors.county.message}</p>}
            </div>
            <div>
              <label className="label">Town / City *</label>
              <input {...register('city')} className="input" placeholder="e.g. Ruaka" />
              {errors.city && <p className="form-error">{errors.city.message}</p>}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h3 className="section-title">Primary Contact</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Contact Name *</label>
              <input {...register('primaryContact')} className="input" placeholder="e.g. James Mwangi" />
              {errors.primaryContact && <p className="form-error">{errors.primaryContact.message}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input {...register('phone')} className="input" placeholder="e.g. 0712345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input {...register('email')} type="email" className="input" placeholder="contact@property.co.ke" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
          </div>
        </div>

        {/* Subscription */}
        <div>
          <h3 className="section-title">Subscription Plan</h3>
          <select {...register('plan')} className="input">
            <option value="SMALL">Small — Up to 20 units (KES 4,000/mo)</option>
            <option value="MEDIUM">Medium — Up to 50 units (KES 8,000/mo)</option>
            <option value="LARGE">Large — Up to 100 units (KES 15,000/mo)</option>
            <option value="ESTATE">Estate — Unlimited units (KES 30,000/mo)</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting && <Spinner size="sm" className="text-white" />}
            {isEdit ? 'Update Property' : 'Create Property'}
          </button>
        </div>
      </form>
    </div>
  )
}
