import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, DoorOpen, UserCheck, Building,
  Package, AlertTriangle, Users, BarChart3, LogOut, Menu,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/property',            label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/property/visitors',   label: 'Visitors',       icon: DoorOpen },
  { to: '/property/tenants',    label: 'Tenants',        icon: UserCheck },
  { to: '/property/units',      label: 'Blocks & Units', icon: Building },
  { to: '/property/deliveries', label: 'Deliveries',     icon: Package },
  { to: '/property/incidents',  label: 'Incidents',      icon: AlertTriangle },
  { to: '/property/staff',      label: 'Staff',          icon: Users },
  { to: '/property/reports',    label: 'Reports',        icon: BarChart3 },
]

export function PropertyManagerLayout() {
  const { user, signOut } = useAuth()
  const navigate           = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <span className="text-white font-bold tracking-wide">LANGO</span>
        </div>
        <p className="text-white/50 text-xs pl-9">Property Manager</p>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2 scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to} to={to} end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10">
        <div className="px-2 py-1.5 mb-1">
          <p className="text-white text-sm font-medium truncate">{user?.profile?.name ?? 'Manager'}</p>
          <p className="text-white/50 text-xs truncate">{user?.email}</p>
        </div>
        <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm w-full">
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full bg-gray-50">
      <aside className="hidden lg:flex flex-col w-60 bg-lango-primary flex-shrink-0">
        <SidebarContent />
      </aside>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-lango-primary flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-lango-primary text-sm">LANGO</span>
          <button onClick={handleSignOut} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            <LogOut className="w-4 h-4" />
          </button>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
