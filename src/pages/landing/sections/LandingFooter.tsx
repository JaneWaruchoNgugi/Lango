import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Globe, AtSign, MessageCircle, Send } from 'lucide-react'
import { LANDING_CONTACT, telLink, mailtoLink } from '../config'

export function LandingFooter() {
  return (
    <footer id="contact" className="bg-lango-dark text-white/80">
      <div className="max-w-6xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center"><span className="font-bold text-sm text-white">L</span></div>
            <span className="font-bold text-white tracking-wide">LANGO</span>
          </div>
          <p className="mt-3 text-sm max-w-xs">Smarter property management for a safer tomorrow.</p>
          <div className="mt-4 flex gap-3">
            {[Globe, AtSign, MessageCircle, Send].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><Icon className="w-4 h-4 text-white" /></a>
            ))}
          </div>
        </div>

        <div className="text-sm space-y-2">
          <p className="font-semibold text-white">Contact</p>
          <a href={telLink} className="flex items-center gap-2 hover:text-white"><Phone className="w-4 h-4" /> {LANDING_CONTACT.phone}</a>
          <a href={mailtoLink} className="flex items-center gap-2 hover:text-white"><Mail className="w-4 h-4" /> {LANDING_CONTACT.email}</a>
          <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> Nairobi, Kenya</p>
        </div>

        <div className="text-sm space-y-2">
          <p className="font-semibold text-white">Company</p>
          <a href="#features" className="block hover:text-white">Features</a>
          <a href="#pricing" className="block hover:text-white">Pricing</a>
          <Link to="/login" className="block hover:text-white">Sign In</Link>
          <a href="#demo" className="block hover:text-white">Book a Demo</a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/50">
          <p>© 2026 Lango. All rights reserved.</p>
          <div className="flex gap-4"><a href="#" className="hover:text-white">Privacy Policy</a><a href="#" className="hover:text-white">Terms of Service</a></div>
        </div>
      </div>
    </footer>
  )
}
