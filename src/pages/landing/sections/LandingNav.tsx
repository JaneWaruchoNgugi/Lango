import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#contact', label: 'Contact' },
]

const Logo = () => (
  <a href="#home" className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-lango-dark flex items-center justify-center text-white font-bold text-sm">L</div>
    <span className="font-bold tracking-wide text-lango-dark">LANGO</span>
  </a>
)

export function LandingNav() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            {LINKS.map(l => <a key={l.href} href={l.href} className="hover:text-lango-primary transition-colors">{l.label}</a>)}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-gray-500">EN</span>
            <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-lango-primary">Sign In</Link>
            <a href="#demo" className="btn-primary">Book a Demo</a>
          </div>
          <button className="md:hidden p-2 text-gray-600" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Mobile slide-in drawer — sibling of the (blurred) header so `fixed` maps to the viewport */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute right-0 top-0 h-full w-72 max-w-[82%] bg-white shadow-2xl flex flex-col p-5">
            <div className="flex items-center justify-between mb-6">
              <Logo />
              <button onClick={() => setOpen(false)} className="p-2 text-gray-500 hover:text-gray-800" aria-label="Close menu"><X className="w-5 h-5" /></button>
            </div>
            <nav className="flex flex-col">
              {LINKS.map(l => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-sm font-medium text-gray-700 border-b border-gray-50 hover:text-lango-primary">{l.label}</a>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-3">
              <Link to="/login" onClick={() => setOpen(false)} className="btn-secondary w-full justify-center">Sign In</Link>
              <a href="#demo" onClick={() => setOpen(false)} className="btn-primary w-full justify-center">Book a Demo</a>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
