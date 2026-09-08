import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MessageCircle, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import type { LandingCopy } from '../i18n'
import { leadFormSchema, isHoneypotTripped, type LeadFormValues } from '../leadForm'
import { createLead } from '../../../services/leadService'
import { waLink, telLink, mailtoLink } from '../config'
import { Spinner } from '../../../components/ui/LoadingScreen'

export function LeadForm({ t }: { t: LandingCopy }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<LeadFormValues>({ resolver: zodResolver(leadFormSchema) })

  const onSubmit = async (values: LeadFormValues) => {
    if (isHoneypotTripped(values)) { reset(); return } // silently drop bots
    try {
      await createLead(values)
      toast.success(t.form.success)
      reset()
    } catch (err) {
      console.error('Lead submit failed', err)
      toast.error(t.form.error)
    }
  }

  return (
    <section id="demo" className="max-w-5xl mx-auto px-4 py-16">
      <div className="card p-6 sm:p-10 grid lg:grid-cols-2 gap-10">
        <div>
          <h2 className="text-3xl font-bold text-lango-dark">{t.form.heading}</h2>
          <p className="mt-2 text-gray-500">{t.form.sub}</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-gray-400">{t.form.or}</p>
          <div className="mt-3 space-y-2">
            <a href={waLink(t.form.waText)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-lango-primary font-medium"><MessageCircle className="w-4 h-4" /> {t.form.whatsapp}</a>
            <a href={telLink} className="flex items-center gap-2 text-sm text-gray-700"><Phone className="w-4 h-4" /> {t.form.call}</a>
            <a href={mailtoLink} className="flex items-center gap-2 text-sm text-gray-700"><Mail className="w-4 h-4" /> {t.form.emailUs}</a>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* honeypot — visually hidden, off-screen; bots fill it */}
          <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="absolute -left-[9999px] w-px h-px" {...register('company_website')} />

          <Field label={t.form.name} error={errors.name?.message}>
            <input className="input" {...register('name')} />
          </Field>
          <Field label={t.form.propertyName} error={errors.propertyName?.message}>
            <input className="input" {...register('propertyName')} />
          </Field>
          <Field label={t.form.propertyType} error={errors.propertyType?.message}>
            <select className="input" defaultValue="" {...register('propertyType')}>
              <option value="" disabled>—</option>
              {t.form.typeOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label={t.form.phone} error={errors.phone?.message}>
            <input className="input" inputMode="tel" {...register('phone')} />
          </Field>
          <Field label={t.form.email} error={errors.email?.message}>
            <input className="input" {...register('email')} />
          </Field>
          <Field label={t.form.message} error={errors.message?.message}>
            <textarea rows={3} className="input" {...register('message')} />
          </Field>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
            {isSubmitting ? <Spinner /> : t.form.submit}
          </button>
        </form>
      </div>
    </section>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="text-xs text-red-500 mt-0.5 block">{error}</span>}
    </label>
  )
}
