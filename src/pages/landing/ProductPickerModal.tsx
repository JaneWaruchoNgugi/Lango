import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Scissors, X, ArrowRight, ShieldCheck, Users } from 'lucide-react'

const SESSION_KEY = 'lango-product-seen'

export function ProductPickerModal() {
  const [visible, setVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) {
      const t = setTimeout(() => setVisible(true), 350)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  const pick = (path: string | null) => {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
    if (path) navigate(path)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-lango-dark/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden
      />

      {/* Sheet / modal */}
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-[slideUp_0.32s_cubic-bezier(.22,1,.36,1)_both]">

        {/* Top accent bar */}
        <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, #2563eb 0%, #f59e0b 100%)' }} />

        {/* Header */}
        <div className="px-7 pt-7 pb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-lango-dark flex items-center justify-center">
                <span className="font-display font-bold text-white text-sm">L</span>
              </div>
              <span className="font-display font-bold text-lango-dark text-lg tracking-wide">LANGO</span>
            </div>
            <h2 className="font-display text-xl font-bold text-lango-dark leading-snug">
              What are you managing?
            </h2>
            <p className="mt-1.5 text-sm text-gray-500 font-dm leading-relaxed">
              Lango builds management software for Kenyan businesses. Pick the product that fits your needs.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="ml-4 mt-0.5 p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product cards */}
        <div className="px-7 pb-7 grid sm:grid-cols-2 gap-3">

          {/* Gate & Property */}
          <button
            onClick={() => pick(null)}
            className="group text-left rounded-2xl border-2 border-gray-100 hover:border-lango-primary bg-gray-50 hover:bg-lango-light/50 p-5 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-lango-primary/10 flex items-center justify-center mb-4">
              <Building2 className="w-5 h-5 text-lango-primary" />
            </div>
            <p className="font-display font-bold text-gray-900 text-sm">Gate & Visitor Management</p>
            <p className="mt-1.5 text-xs text-gray-500 font-dm leading-relaxed">
              For apartments, estates and gated properties. Control visitor access, deliveries and incidents.
            </p>
            <ul className="mt-3 space-y-1.5">
              {['Visitor check-in & WhatsApp alerts', 'Delivery tracking', 'Incident reports'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[11px] text-gray-500 font-dm">
                  <ShieldCheck className="w-3 h-3 text-lango-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-lango-primary font-dm group-hover:gap-2 transition-all">
              Explore <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          {/* Salon */}
          <button
            onClick={() => pick('/salon')}
            className="group text-left rounded-2xl border-2 border-gray-100 hover:border-lango-amber bg-gray-50 hover:bg-amber-50/50 p-5 transition-all"
          >
            <div className="w-11 h-11 rounded-xl bg-lango-amber/10 flex items-center justify-center mb-4">
              <Scissors className="w-5 h-5 text-lango-amber" />
            </div>
            <p className="font-display font-bold text-gray-900 text-sm">Salon Management</p>
            <p className="mt-1.5 text-xs text-gray-500 font-dm leading-relaxed">
              For salons with staff, providers and multiple branches. Client records and granular permissions.
            </p>
            <ul className="mt-3 space-y-1.5">
              {['Client & booking management', 'Staff access permissions', 'Multi-branch & M-Pesa'].map(f => (
                <li key={f} className="flex items-center gap-2 text-[11px] text-gray-500 font-dm">
                  <Users className="w-3 h-3 text-lango-amber shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-lango-amber font-dm group-hover:gap-2 transition-all">
              Explore <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </div>

        {/* Footer note */}
        <div className="px-7 pb-6 pt-0">
          <p className="text-center text-[11px] text-gray-400 font-dm">
            Not sure? <button onClick={dismiss} className="underline hover:text-gray-600 transition-colors">Browse both</button> — or{' '}
            <a href="#consultation" onClick={dismiss} className="underline hover:text-gray-600 transition-colors">book a free call</a> and we'll guide you.
          </p>
        </div>
      </div>
    </div>
  )
}
