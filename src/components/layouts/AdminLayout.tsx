import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Bell,
  ScrollText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  Inbox,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const navItems = [
  { to: '/admin',               label: 'Dashboard',     icon: LayoutDashboard, end: true },
  { to: '/admin/properties',    label: 'Properties',    icon: Building2 },
  { to: '/admin/staff',         label: 'Staff',         icon: Users },
  { to: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
  { to: '/admin/leads',         label: 'Leads',         icon: Inbox },
  { to: '/admin/reports',       label: 'Reports',       icon: BarChart3 },
  { to: '/admin/notifications',  label: 'Notifications', icon: Bell },
  { to: '/admin/audit-logs',    label: 'System Logs',   icon: ScrollText },
  { to: '/admin/settings',      label: 'Settings',      icon: Settings },
]

export function AdminLayout() {
  const { user, signOut } = useAuth()
  const navigate           = useNavigate()
  const [collapsed, setCollapsed]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out successfully')
    navigate('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center px-2' : ''}`}>
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">L</span>
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-lg tracking-wide">LANGO</span>
            <p className="text-white/50 text-xs -mt-0.5">Super Admin</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-2 scrollbar-hide">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? label : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User + Sign out */}
      <div className={`p-3 border-t border-white/10`}>
        {!collapsed && (
          <div className="px-2 py-1.5 mb-1">
            <p className="text-white text-sm font-medium truncate">{user?.profile?.name ?? 'Super Admin'}</p>
            <p className="text-white/50 text-xs truncate">{user?.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors w-full ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-full bg-gray-50 relative">
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-lango-primary transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Desktop collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`hidden lg:flex items-center justify-center absolute top-1/2 -translate-y-1/2 z-20 w-5 h-5 bg-lango-primary text-white rounded-full border border-white/30 hover:bg-lango-secondary transition-all duration-300 ${
          collapsed ? 'left-14' : 'left-[236px]'
        }`}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-lango-primary flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-lango-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">L</span>
            </div>
            <span className="font-bold text-lango-primary text-sm">LANGO</span>
          </div>
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
