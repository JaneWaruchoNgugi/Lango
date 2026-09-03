import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { OnlineIndicator } from '../ui/OnlineIndicator'
import toast from 'react-hot-toast'

export function GuardLayout() {
  const { user, signOut } = useAuth()
  const navigate           = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    toast.success('Signed out')
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Guard topbar - minimal */}
      <header className="flex items-center justify-between px-4 py-3 bg-lango-primary text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-xs">L</span>
          </div>
          <div>
            <span className="font-bold text-sm tracking-wide">LANGO</span>
            <p className="text-white/60 text-xs -mt-0.5">Gate System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <OnlineIndicator />
          <div className="text-right hidden sm:block">
            <p className="text-white text-xs font-medium">{user?.profile?.name ?? 'Guard'}</p>
            <p className="text-white/60 text-xs">Security Guard</p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Guard content - full remaining height */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
