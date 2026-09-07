import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import type { LandingCopy, LandingLang } from '../i18n'
import { waLink } from '../config'

export function LandingNav({ t, lang, setLang }: { t: LandingCopy; lang: LandingLang; setLang: (l: LandingLang) => void }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lango-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="font-bold text-lango-dark tracking-wide">LANGO</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(['en', 'sw'] as LandingLang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-2.5 py-1.5 font-medium ${lang === l ? 'bg-lango-primary text-white' : 'text-gray-600'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-lango-primary px-2">{t.nav.signIn}</Link>
          <a href={waLink(t.form.heading)} target="_blank" rel="noreferrer" className="btn-primary text-sm hidden sm:inline-flex">{t.nav.bookDemo}</a>
          <a href="#demo" className="btn-primary text-sm sm:hidden p-2" aria-label={t.nav.bookDemo}><Menu className="w-4 h-4" /></a>
        </div>
      </div>
    </header>
  )
}
