import { Wifi, WifiOff } from 'lucide-react'
import { useOnline } from '../../contexts/OnlineContext'

export function OnlineIndicator() {
  const { isOnline } = useOnline()

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
      isOnline
        ? 'bg-green-100 text-green-700'
        : 'bg-orange-100 text-orange-700 animate-pulse'
    }`}>
      {isOnline ? (
        <>
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3 h-3" />
          <span>Offline — Changes will sync</span>
        </>
      )}
    </div>
  )
}
