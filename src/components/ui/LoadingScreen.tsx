import { Loader2 } from 'lucide-react'

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-lango-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">L</span>
          </div>
          <span className="text-lg font-bold text-lango-primary">LANGO</span>
        </div>
        <Loader2 className="w-5 h-5 text-lango-primary animate-spin" />
      </div>
    </div>
  )
}

export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-8 h-8' }[size]
  return <Loader2 className={`${sizeClass} animate-spin text-lango-primary ${className}`} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Spinner size="lg" />
    </div>
  )
}
