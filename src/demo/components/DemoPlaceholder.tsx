import { Sparkles } from 'lucide-react'

export function DemoPlaceholder({ title = 'Coming up in this demo' }: { title?: string }) {
  return (
    <div className="max-w-md mx-auto card p-8 text-center mt-6">
      <div className="w-14 h-14 rounded-full bg-lango-primary/10 flex items-center justify-center mx-auto mb-4">
        <Sparkles className="w-7 h-7 text-lango-primary" />
      </div>
      <h3 className="font-bold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">We're building this part of the interactive demo next. Use the role switcher above to explore the Property Manager experience.</p>
    </div>
  )
}
