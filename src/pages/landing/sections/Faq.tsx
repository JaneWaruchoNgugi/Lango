import { ChevronDown, MessageCircle } from 'lucide-react'

const FAQS: { q: string; a: string }[] = [
  { q: 'How long does setup take?', a: 'Most properties are live within a day. We create your account, add your blocks and units, and train your guards over a short call — no lengthy installation.' },
  { q: 'Do we need special hardware?', a: 'No. Lango runs on any smartphone, tablet or computer with a browser. Your guards can start registering visitors immediately — no gadgets to buy.' },
  { q: 'Who owns the data?', a: 'You do. Every visitor, delivery and incident record belongs to your property and is kept private and secure. You can export it any time.' },
  { q: 'Can it handle more than one property?', a: 'Yes. Manage multiple blocks, estates or sites from one account, each with its own guards, residents and records.' },
]

export function Faq() {
  return (
    <section id="faq" className="max-w-6xl mx-auto px-4 py-16 lg:py-20 grid lg:grid-cols-2 gap-10 items-start">
      <div>
        <span className="text-xs font-semibold tracking-wide uppercase text-lango-primary">Frequently asked questions</span>
        <h2 className="mt-3 text-3xl font-bold text-lango-dark">Have questions? We've got answers.</h2>
        <p className="mt-3 text-gray-500">Everything you need to know about Lango.</p>
        <div className="mt-6 space-y-3">
          {FAQS.map(f => (
            <details key={f.q} className="card p-5 group">
              <summary className="font-medium text-gray-900 cursor-pointer list-none flex justify-between items-center gap-3">
                {f.q}<ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <p className="mt-3 text-sm text-gray-500 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex justify-center">
        <div className="relative">
          <div className="rounded-2xl border border-gray-100 bg-white shadow-card-hover w-64 p-4">
            <div className="h-2 w-24 bg-gray-100 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-2 w-full bg-gray-100 rounded" /><div className="h-2 w-4/5 bg-gray-100 rounded" /><div className="h-2 w-3/5 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="absolute -right-4 top-6 bg-white rounded-xl shadow-card px-3 py-2 flex items-center gap-2 border border-gray-100 w-52">
            <span className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4 text-white" /></span>
            <div><p className="text-[11px] font-semibold text-gray-900">Lango</p><p className="text-[10px] text-gray-500">Visitor approved for Block A</p></div>
          </div>
          <div className="absolute -left-6 -bottom-4 bg-lango-primary text-white text-xs font-medium rounded-full px-3 py-1.5 shadow-card">Instant alerts via WhatsApp</div>
        </div>
      </div>
    </section>
  )
}
