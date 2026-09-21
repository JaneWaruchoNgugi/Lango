import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#how',      label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing',  label: 'Pricing' },
  { href: '#contact',  label: 'Contact' },
]

export function LandingNav() {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <header className={`fixed top-0 inset-x-0 z-40 l-nav-transition ${scrolled ? 'l-nav-scrolled' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <a href="#home" className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${scrolled ? 'bg-lango-dark' : 'bg-white/12'}`}>
              <span className="font-display font-bold text-sm text-white">L</span>
            </div>
            <span className={`font-display font-bold tracking-wide text-base transition-colors ${scrolled ? 'text-lango-dark' : 'text-white'}`}>
              LANGO
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium font-dm">
            {LINKS.map(l => (
              <a
                key={l.href}
                href={l.href}
                className={`transition-colors duration-200 ${scrolled ? 'text-gray-500 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className={`text-sm font-medium font-dm transition-colors ${scrolled ? 'text-gray-600 hover:text-gray-900' : 'text-white/65 hover:text-white'}`}
            >
              Sign In
            </Link>
            <a
              href="/demo"
              className={`text-sm font-semibold font-dm px-4 py-2 rounded-lg transition-all ${
                scrolled
                  ? 'bg-lango-primary text-white hover:bg-lango-secondary'
                  : 'bg-white/10 text-white border border-white/18 hover:bg-white/16 hover:border-white/28'
              }`}
            >
              Explore Demo →
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? 'text-gray-600' : 'text-white/80'}`}
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile slide-in drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-2xl flex flex-col p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-lango-dark flex items-center justify-center">
                  <span className="font-display font-bold text-sm text-white">L</span>
                </div>
                <span className="font-display font-bold text-lango-dark">LANGO</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-gray-400 hover:text-gray-700" aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {LINKS.map(l => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 px-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-lango-primary transition-colors font-dm"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center">Sign In</Link>
              <a href="/demo" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">Explore Demo</a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
