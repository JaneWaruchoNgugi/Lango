import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Settings, type LucideIcon } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { OnlinePill } from '../ui/OnlinePill'
import toast from 'react-hot-toast'

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

interface Props {
  navItems: NavItem[]
  bottomNav: NavItem[]
  roleLabel: string
  settingsTo?: string
}

/**
 * The one responsive app shell shared by all roles.
 *  - Desktop (lg+): full navy sidebar with labels + profile block.
 *  - Tablet (md–lg): icon-only navy rail.
 *  - Mobile (<md): light top bar + slide-over drawer + bottom tab bar.
 */
export function AppShell({ navItems, bottomNav, roleLabel, settingsTo }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const name = user?.profile?.name ?? roleLabel
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const handleSignOut = async () => { await signOut(); toast.success('Signed out'); navigate('/login') }

  const Sidebar = ({ full }: { full?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-3 px-4 py-5 ${full ? '' : 'md:justify-center lg:justify-start lg:px-5'}`}>
        <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center font-bold shrink-0">L</div>
        <div className={full ? '' : 'hidden lg:block'}><p className="font-bold tracking-wide leading-tight">LANGO</p><p className="text-white/50 text-xs">{roleLabel}</p></div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-1 px-2 lg:px-3 scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} title={label}
            className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${full ? '' : 'md:justify-center lg:justify-start'} ${
              isActive ? 'bg-lango-primary text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
            <Icon className="w-5 h-5 shrink-0" /> <span className={full ? '' : 'hidden lg:inline'}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 lg:px-3 py-4 border-t border-white/10">
        <div className={`flex items-center gap-3 px-2 py-2 ${full ? '' : 'md:justify-center lg:justify-start'}`}>
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold shrink-0">{initials}</div>
          <div className={`flex-1 min-w-0 ${full ? '' : 'hidden lg:block'}`}><p className="text-sm font-medium truncate">{name}</p><p className="text-white/50 text-xs">{roleLabel}</p></div>
          {settingsTo && <button onClick={() => { setMobileOpen(false); navigate(settingsTo) }} className={`text-white/60 hover:text-white ${full ? '' : 'hidden lg:block'}`}><Settings className="w-4 h-4" /></button>}
        </div>
        <button onClick={handleSignOut} title="Logout" className={`flex items-center gap-3 px-2 py-2 mt-1 w-full text-sm text-white/70 hover:text-white ${full ? '' : 'md:justify-center lg:justify-start'}`}>
          <LogOut className="w-4 h-4 shrink-0" /> <span className={full ? '' : 'hidden lg:inline'}>Logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full bg-gray-50">
      {/* Sidebar: icon-only on tablet, full on desktop */}
      <aside className="hidden md:flex md:flex-col md:w-16 lg:w-60 shrink-0 bg-lango-dark text-white transition-[width]"><Sidebar /></aside>

      {/* Mobile drawer (full labels) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-lango-dark text-white flex flex-col shadow-2xl"><Sidebar full /></aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-lango-dark rounded-md flex items-center justify-center"><span className="text-white font-bold text-xs">L</span></div>
            <span className="font-bold text-lango-dark text-sm">LANGO</span>
          </div>
          <button onClick={handleSignOut} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><LogOut className="w-4 h-4" /></button>
        </header>

        {/* Desktop/tablet top bar */}
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-3">
          <OnlinePill />
          <button onClick={handleSignOut} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100"><LogOut className="w-4 h-4" /></button>
        </div>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 md:pb-6"><Outlet /></main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex justify-around py-2 z-40">
          {bottomNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-medium ${isActive ? 'text-lango-primary' : 'text-gray-400'}`}>
              <item.icon className="w-5 h-5" /> {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
