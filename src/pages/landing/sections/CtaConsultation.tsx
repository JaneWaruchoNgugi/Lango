import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CreditCard, Zap, HeadphonesIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadFormSchema, isHoneypotTripped, type LeadFormValues } from '../leadForm'
import { createLead } from '../../../services/leadService'
import { Spinner } from '../../../components/ui/LoadingScreen'

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Gated estate', 'Other']

const PERKS = [
  { icon: CreditCard, label: 'Walk through pricing for your property size' },
  { icon: Zap, label: 'Get set up and live within 24 hours' },
  { icon: HeadphonesIcon, label: 'Dedicated onboarding support included' },
]

export function CtaConsultation() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    if (isHoneypotTripped(values)) { reset(); return }
    try {
      await createLead(values)
      toast.success('Thanks! We\'ll call you within one business day to confirm your plan and get you set up.')
      reset()
    } catch (err) {
      console.error('Lead submit failed', err)
      toast.error('Something went wrong. Please try again or WhatsApp us directly.')
    }
  }

  return (
    <section id="consultation" className="max-w-6xl mx-auto px-4 pb-20">
      <div className="rounded-3xl bg-lango-dark text-white overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-10 p-8 sm:p-12">
          <div>
            <span className="inline-block text-xs font-semibold tracking-wide uppercase text-white/70 bg-white/10 px-3 py-1 rounded-full">
              Ready to get started?
            </span>
            <h2 className="mt-5 text-3xl font-bold">Book a free consultation</h2>
            <p className="mt-3 text-white/70 max-w-md">
              Speak with our team, choose the right plan for your property, and get access the same day — no pressure, no commitment until you're ready.
            </p>
            <div className="mt-8 space-y-3">
              {PERKS.map(p => (
                <div key={p.label} className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <p.icon className="w-4 h-4" />
                  </span>
                  {p.label}
                </div>
              ))}
            </div>
            <p className="mt-8 text-xs text-white/40">
              No credit card required to book. We'll confirm within one business day.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl p-6 space-y-3 text-gray-900">
            {/* honeypot */}
            <input
              type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
              className="absolute -left-[9999px] w-px h-px" {...register('company_website')}
            />
            <div>
              <input className="input" placeholder="Your name" {...register('name')} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <input className="input" placeholder="Property name" {...register('propertyName')} />
            </div>
            <div>
              <input className="input" placeholder="Email address" {...register('email')} />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <input className="input" inputMode="tel" placeholder="Phone number" {...register('phone')} />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>
            <div>
              <select className="input text-gray-700" defaultValue="" {...register('propertyType')}>
                <option value="" disabled>Property type</option>
                {PROPERTY_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              {errors.propertyType && <p className="form-error">{errors.propertyType.message}</p>}
            </div>
            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              {isSubmitting
                ? <Spinner size="sm" className="text-white" />
                : <>Book Consultation <ArrowRight className="w-4 h-4" /></>
              }
            </button>
            <p className="text-center text-xs text-gray-400">
              Free, no-obligation call with our team
            </p>
          </form>
        </div>
      </div>
    </section>
  )
}
