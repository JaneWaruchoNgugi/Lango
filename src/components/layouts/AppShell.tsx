import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Menu, Settings, Bell, type LucideIcon } from 'lucide-react'
import { collection, query, where, onSnapshot, orderBy, limit, writeBatch, doc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { OnlinePill } from '../ui/OnlinePill'
import { LangoLogo } from '../ui/LangoLogo'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import type { Notification, AdminAlert } from '../../types'

function NotificationBell({ propertyId, role }: { propertyId: string | null | undefined; role: string | null | undefined }) {
  const navigate = useNavigate()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isSuperAdmin = role === 'SUPER_ADMIN'

  // Property-level notifications (guards / PMs)
  useEffect(() => {
    if (isSuperAdmin || !propertyId) return
    const q = query(
      collection(db, 'notifications'),
      where('propertyId', '==', propertyId),
      orderBy('createdAt', 'desc'),
      limit(20),
    )
    return onSnapshot(q, snap => setNotifs(snap.docs.map(d => d.data() as Notification)),
      err => console.error('[NotificationBell]', err))
  }, [propertyId, isSuperAdmin])

  // Super Admin — platform-level lead alerts
  useEffect(() => {
    if (!isSuperAdmin) return
    const q = query(
      collection(db, 'adminAlerts'),
      orderBy('createdAt', 'desc'),
      limit(30),
    )
    return onSnapshot(q, snap => {
      setAlerts(snap.docs.map(d => ({ ...d.data(), alertId: d.id } as AdminAlert)))
    }, err => console.error('[NotificationBell:adminAlerts]', err))
  }, [isSuperAdmin])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAlertsRead = async (unreadAlerts: AdminAlert[]) => {
    if (unreadAlerts.length === 0) return
    const batch = writeBatch(db)
    unreadAlerts.forEach(a => batch.update(doc(db, 'adminAlerts', a.alertId), { read: true }))
    await batch.commit().catch(err => console.error('[markAlertsRead]', err))
  }

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && isSuperAdmin) {
      const unread = alerts.filter(a => !a.read)
      markAlertsRead(unread)
    }
  }

  // Property notifications don't have a read state in the type — show full count as "unread"
  const unread = isSuperAdmin
    ? alerts.filter(a => !a.read).length
    : notifs.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lango-primary/40"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-pop border border-gray-200/70 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
            {unread > 0 && <span className="text-xs text-lango-primary font-medium">{unread} new</span>}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {isSuperAdmin ? (
              alerts.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No lead requests yet</p>
              ) : alerts.map(a => (
                <button
                  key={a.alertId}
                  onClick={() => { setOpen(false); navigate('/admin/leads') }}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${!a.read ? 'bg-blue-50/40' : ''}`}
                >
                  <p className="text-xs font-medium text-gray-900">New consultation request</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.name} · {a.propertyType} · {a.phone}</p>
                  {a.createdAt && (
                    <p className="text-[10px] text-gray-300 mt-0.5">
                      {format(a.createdAt.toDate(), 'dd MMM, h:mm a')}
                    </p>
                  )}
                </button>
              ))
            ) : (
              notifs.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">No notifications yet</p>
              ) : notifs.map((n, idx) => (
                <div key={n.notificationId ?? idx} className="px-4 py-3 bg-blue-50/40">
                  <p className="text-xs font-medium text-gray-900 truncate">{n.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface NavItem { to: string; label: string; icon: LucideIcon; end?: boolean }

interface Props {
  navItems: NavItem[]
  bottomNav: NavItem[]
  roleLabel: string
  settingsTo?: string
  onSignOut?: () => void
  signOutLabel?: string
}

/**
 * The one responsive app shell shared by all roles.
 *  - Desktop (lg+): full navy sidebar with labels + profile block.
 *  - Tablet (md–lg): icon-only navy rail.
 *  - Mobile (<md): light top bar + slide-over drawer + bottom tab bar.
 */
export function AppShell({ navItems, bottomNav, roleLabel, settingsTo, onSignOut, signOutLabel }: Props) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const name = user?.profile?.name ?? roleLabel
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  const handleSignOut = async () => { await signOut(); toast.success('Signed out'); navigate('/login') }
  const exit = onSignOut ?? handleSignOut
  const exitLabel = signOutLabel ?? 'Logout'

  const Sidebar = ({ full }: { full?: boolean }) => (
    <div className="flex flex-col h-full">
      <div className={`flex items-center px-4 h-16 border-b border-white/[0.06] ${full ? '' : 'md:justify-center lg:justify-start lg:px-5'}`}>
        <span className={full ? '' : 'lg:hidden'}>{!full && <LangoLogo size={32} wordmark={false} />}</span>
        <LangoLogo size={32} tone="light" caption={roleLabel} className={full ? '' : 'hidden lg:inline-flex'} />
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2 lg:px-3 scrollbar-hide" aria-label="Main">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setMobileOpen(false)} title={label}
            className={({ isActive }) => `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${full ? '' : 'md:justify-center lg:justify-start'} ${
              isActive
                ? 'bg-white/[0.09] text-white before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-r before:bg-lango-accent'
                : 'text-white/60 hover:bg-white/[0.05] hover:text-white'}`}>
            <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.9} /> <span className={full ? '' : 'hidden lg:inline'}>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-2 lg:px-3 py-4 border-t border-white/10">
        <div className={`flex items-center gap-3 px-2 py-2 ${full ? '' : 'md:justify-center lg:justify-start'}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-lango-accent to-lango-secondary ring-2 ring-white/10 flex items-center justify-center text-[13px] font-semibold shrink-0">{initials}</div>
          <div className={`flex-1 min-w-0 ${full ? '' : 'hidden lg:block'}`}><p className="text-sm font-medium truncate">{name}</p><p className="text-white/50 text-xs">{roleLabel}</p></div>
          {settingsTo && <button onClick={() => { setMobileOpen(false); navigate(settingsTo) }} aria-label="Settings" className={`p-1 rounded-md text-white/50 hover:text-white hover:bg-white/5 ${full ? '' : 'hidden lg:block'}`}><Settings className="w-4 h-4" /></button>}
        </div>
        <button onClick={exit} title={exitLabel} className={`flex items-center gap-3 px-3 py-2 mt-1 w-full rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] ${full ? '' : 'md:justify-center lg:justify-start'}`}>
          <LogOut className="w-4 h-4 shrink-0" /> <span className={full ? '' : 'hidden lg:inline'}>{exitLabel}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full bg-surface">
      {/* Sidebar: icon-only on tablet, full on desktop */}
      <aside className="hidden md:flex md:flex-col md:w-[68px] lg:w-64 shrink-0 bg-lango-dark text-white transition-[width]"><Sidebar /></aside>

      {/* Mobile drawer (full labels) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-lango-dark text-white flex flex-col shadow-2xl"><Sidebar full /></aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-3 h-14 bg-white/90 backdrop-blur border-b border-gray-200/70 shrink-0">
          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"><Menu className="w-5 h-5" /></button>
          <LangoLogo size={26} />
          <NotificationBell propertyId={user?.propertyId} role={user?.role} />
        </header>

        {/* Desktop/tablet top bar */}
        <div className="hidden md:flex items-center justify-end gap-2.5 px-6 lg:px-8 h-14 shrink-0">
          <OnlinePill />
          <NotificationBell propertyId={user?.propertyId} role={user?.role} />
        </div>

        <main className="flex-1 overflow-y-auto px-4 pt-4 md:pt-0 md:px-6 lg:px-8 pb-28 md:pb-10">
          <div className="mx-auto w-full max-w-7xl"><Outlet /></div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-gray-200/70 flex justify-around pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40" aria-label="Quick">
          {bottomNav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `flex flex-col items-center gap-1 px-3 py-1 text-[11px] font-medium transition-colors ${isActive ? 'text-lango-primary' : 'text-gray-400 hover:text-gray-600'}`}>
              {({ isActive }) => (<>
                <span className={`flex items-center justify-center w-12 h-7 rounded-full transition-colors ${isActive ? 'bg-lango-light' : ''}`}><item.icon className="w-5 h-5" /></span> {item.label}
              </>)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
