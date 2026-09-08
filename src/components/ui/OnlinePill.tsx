import { useEffect, useState } from 'react'

/** Small green/red pill reflecting the browser's online/offline state. */
export function OnlinePill() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${online ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
      {online ? 'Online' : 'Offline'}
    </span>
  )
}
