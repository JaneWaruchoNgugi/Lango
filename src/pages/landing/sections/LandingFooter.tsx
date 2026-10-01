import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { LANDING_CONTACT, telLink, mailtoLink } from '../config'

export function LandingFooter() {
  return (
    <footer id="contact" className="bg-lango-dark">
      <div className="px-6 sm:px-10 lg:px-16 xl:px-24 pt-16 pb-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-12">

          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="font-display font-bold text-sm text-white">L</span>
              </div>
              <span className="font-display font-bold text-white text-base tracking-wide">LANGO</span>
            </div>
            <p className="text-sm text-white/40 font-dm leading-relaxed max-w-xs">
              Smart gate management for Kenyan properties. Real-time records, instant WhatsApp alerts, zero paper.
            </p>
            <div className="mt-7">
              <a
                href="#consultation"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-lango-amber hover:text-amber-300 transition-colors font-dm"
              >
                Book a free consultation →
              </a>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-5 font-dm">Contact</p>
            <div className="space-y-3.5 text-sm text-white/45 font-dm">
              <a href={telLink} className="flex items-center gap-3 hover:text-white transition-colors">
                <Phone className="w-3.5 h-3.5 text-white/25" />
                {LANDING_CONTACT.phone}
              </a>
              <a href={mailtoLink} className="flex items-center gap-3 hover:text-white transition-colors">
                <Mail className="w-3.5 h-3.5 text-white/25" />
                {LANDING_CONTACT.email}
              </a>
              <p className="flex items-center gap-3">
                <MapPin className="w-3.5 h-3.5 text-white/25" />
                Nairobi, Kenya
              </p>
            </div>
          </div>

          {/* Links */}
          <div>
            <p className="text-[11px] font-bold text-white/25 uppercase tracking-widest mb-5 font-dm">Product</p>
            <div className="space-y-3 text-sm text-white/45 font-dm">
              <a href="#features"   className="block hover:text-white transition-colors">Features</a>
              <a href="#pricing"    className="block hover:text-white transition-colors">Pricing</a>
              <a href="#how"        className="block hover:text-white transition-colors">How it works</a>
              <Link to="/login"     className="block hover:text-white transition-colors">Sign In</Link>
              <a href="/demo"       className="block hover:text-white transition-colors">Explore Demo</a>
              <Link to="/salon"     className="block text-lango-amber hover:text-amber-300 transition-colors">Lango Salon →</Link>
            </div>
          </div>

        </div>

        <div className="border-t border-white/7 pt-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-gray-400 font-dm">
          <p>© 2026 Lango. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
