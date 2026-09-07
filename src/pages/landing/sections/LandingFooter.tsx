import { Link } from 'react-router-dom'
import type { LandingCopy } from '../i18n'
import { LANDING_CONTACT, waLink, telLink, mailtoLink } from '../config'

export function LandingFooter({ t }: { t: LandingCopy }) {
  return (
    <footer className="bg-lango-dark text-white/80">
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center"><span className="font-bold text-sm text-white">L</span></div>
            <span className="font-bold text-white tracking-wide">LANGO</span>
          </div>
          <p className="mt-3 text-sm max-w-xs">{t.footerTagline}</p>
        </div>
        <div className="text-sm space-y-2">
          <a href={waLink()} target="_blank" rel="noreferrer" className="block hover:text-white">WhatsApp</a>
          <a href={telLink} className="block hover:text-white">{LANDING_CONTACT.phone}</a>
          <a href={mailtoLink} className="block hover:text-white">{LANDING_CONTACT.email}</a>
          <Link to="/login" className="block hover:text-white">{t.nav.signIn}</Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">© 2026 Lango. All rights reserved.</div>
    </footer>
  )
}
