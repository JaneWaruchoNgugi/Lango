import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, UserCheck, MessagesSquare, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { leadFormSchema, isHoneypotTripped, type LeadFormValues } from '../leadForm'
import { createLead } from '../../../services/leadService'
import { Spinner } from '../../../components/ui/LoadingScreen'

const PROPERTY_TYPES = ['Residential', 'Commercial', 'Institutional', 'Industrial', 'Gated estate', 'Other']
const PERKS = [
  { icon: UserCheck, label: 'Personalized walkthrough' },
  { icon: MessagesSquare, label: 'Q&A with our team' },
  { icon: Settings, label: 'Setup guidance' },
]

export function CtaDemo() {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    if (isHoneypotTripped(values)) { reset(); return }
    try { await createLead(values); toast.success('Thanks! We\'ll be in touch shortly to set up your demo.'); reset() }
    catch (err) { console.error('Lead submit failed', err); toast.error('Something went wrong. Please try again or WhatsApp us.') }
  }

  return (
    <section id="demo" className="max-w-6xl mx-auto px-4 pb-20">
      <div className="rounded-3xl bg-lango-dark text-white overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-10 p-8 sm:p-12">
          <div>
            <span className="inline-block text-xs font-semibold tracking-wide uppercase text-white/70 bg-white/10 px-3 py-1 rounded-full">Ready to get started?</span>
            <h2 className="mt-5 text-3xl font-bold">Book a free demo</h2>
            <p className="mt-3 text-white/70 max-w-md">See how Lango can make your property safer, smarter and more efficient — no cost, no commitment.</p>
            <div className="mt-8 space-y-3">
              {PERKS.map(p => (
                <div key={p.label} className="flex items-center gap-3 text-sm">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><p.icon className="w-4 h-4" /></span>
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl p-6 space-y-3 text-gray-900">
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] w-px h-px" {...register('company_website')} />
            <div>
              <input className="input" placeholder="Your name" {...register('name')} />
              {errors.name && <p className="form-error">{errors.name.message}</p>}
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
              {isSubmitting ? <Spinner size="sm" className="text-white" /> : <>Request Demo <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
