import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CreditCard, Zap, HeadphonesIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadFormSchema, isHoneypotTripped, type LeadFormValues } from '../leadForm'
import { createLead } from '../../../services/leadService'
import { Spinner } from '../../../components/ui/LoadingScreen'
import { Reveal } from '../components/Reveal'

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Gated estate', 'Other']

const PERKS = [
  { icon: CreditCard,       label: 'Walk through pricing for your property size' },
  { icon: Zap,              label: 'Get set up and live within 24 hours' },
  { icon: HeadphonesIcon,   label: 'Dedicated onboarding support included' },
]

export function CtaConsultation() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    if (isHoneypotTripped(values)) { reset(); return }
    try {
      await createLead(values)
      toast.success("Thanks! We'll call you within one business day to confirm your plan and get you set up.")
      reset()
    } catch (err) {
      console.error('Lead submit failed', err)
      toast.error('Something went wrong. Please try again or WhatsApp us directly.')
    }
  }

  return (
    <section id="consultation" className="bg-gray-50/70 py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-4">
        <Reveal>
          <div className="rounded-3xl bg-lango-dark overflow-hidden relative">
            {/* Dot-grid texture */}
            <div className="absolute inset-0 l-hero-grid opacity-60" aria-hidden />
            {/* Blue orb */}
            <div
              className="absolute -left-28 -top-28 w-96 h-96 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 65%)' }}
              aria-hidden
            />

            <div className="relative grid lg:grid-cols-2 gap-12 p-8 sm:p-12 lg:p-14">
              {/* Left: pitch */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-6">
                  <span className="w-6 h-px bg-white/20" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/35 font-dm">Ready to get started?</span>
                </div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                  Book a free consultation
                </h2>
                <p className="mt-4 text-white/55 font-dm leading-relaxed max-w-sm">
                  Speak with our team, pick the right plan for your property, and get access the same day. No pressure.
                </p>
                <div className="mt-9 space-y-4">
                  {PERKS.map(perk => (
                    <div key={perk.label} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/7 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <perk.icon className="w-4 h-4 text-white/60" />
                      </div>
                      <p className="text-sm text-white/65 font-dm">{perk.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-9 text-xs text-white/22 font-dm">
                  No credit card required · We'll confirm within one business day
                </p>
              </div>

              {/* Right: form */}
              <div>
                <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl p-7 space-y-3.5 shadow-2xl">
                  {/* honeypot */}
                  <input
                    type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px"
                    {...register('company_website')}
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
                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3 text-base">
                    {isSubmitting
                      ? <Spinner size="sm" className="text-white" />
                      : <>Book Consultation <ArrowRight className="w-4 h-4" /></>
                    }
                  </button>
                  <p className="text-center text-xs text-gray-400 font-dm">Free, no-obligation call with our team</p>
                </form>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
