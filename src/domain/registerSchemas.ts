import { z } from 'zod'

const durationField = z.preprocess(
  v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().positive().optional(),
)

const guest = {
  visitorName: z.string().min(2, 'Name is required'),
  phone: z.string().min(9, 'Phone is required'),
  idNumber: z.string().optional(),
  nationality: z.string().optional(),
  vehicleRegistration: z.string().optional(),
  blockId: z.string().min(1, 'Select a block'),
  unitId: z.string().min(1, 'Select a unit'),
  notes: z.string().optional(),
}

const friendly = z.object({
  ...guest, visitType: z.literal('FRIENDLY_VISIT'), reason: z.string().optional(),
  company: z.string().optional(),
  numberOfVisitors: z.preprocess(
    v => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().min(1).optional(),
  ),
})

const work = z.object({
  ...guest, visitType: z.literal('WORK'),
  company: z.string().optional(),
  workType: z.string().min(2, 'Type of work is required'),
  workDescription: z.string().optional(),
  expectedDurationMins: durationField,
})

const delivery = z.object({
  ...guest, visitType: z.literal('DELIVERY'),
  company: z.string().min(1, 'Delivery company is required'),
  deliveryType: z.string().optional(),
  trackingNumber: z.string().optional(),
  packageDescription: z.string().optional(),
  riderName: z.string().optional(),
})

const service = z.object({
  ...guest, visitType: z.literal('SERVICE_PROVIDER'),
  serviceType: z.string().min(2, 'The service you are here to provide is required'),
  serviceDescription: z.string().optional(),
  company: z.string().optional(),
  appointment: z.enum(['SCHEDULED', 'UNSCHEDULED']).optional(),
  expectedDurationMins: durationField,
})

export const registerGuestSchema = z.discriminatedUnion('visitType', [friendly, work, delivery, service])
export type RegisterGuestInput = z.infer<typeof registerGuestSchema>
