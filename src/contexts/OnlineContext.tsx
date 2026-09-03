import React, { createContext, useContext, useEffect, useState } from 'react'

interface OnlineContextType {
  isOnline: boolean
}

const OnlineContext = createContext<OnlineContextType>({ isOnline: true })

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <OnlineContext.Provider value={{ isOnline }}>
      {children}
    </OnlineContext.Provider>
  )
}

export function useOnline() {
  return useContext(OnlineContext)
}
