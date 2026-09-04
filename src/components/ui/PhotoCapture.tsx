import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface Props {
  label?: string
  onCapture: (blob: Blob | null) => void
  disabled?: boolean
}

/** Optional photo capture. Uses the device camera on mobile via capture="environment". */
export function PhotoCapture({ label = 'Add photo (optional)', onCapture, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onCapture(file)
  }
  const clear = () => { setPreview(null); onCapture(null); if (inputRef.current) inputRef.current.value = '' }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only"
        onChange={e => handleFile(e.target.files?.[0])} disabled={disabled} />
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="capture" className="w-24 h-24 rounded-xl object-cover border border-gray-200" />
          <button type="button" onClick={clear} className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1">
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}
          className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 text-sm w-full justify-center">
          <Camera className="w-4 h-4" /> {label}
        </button>
      )}
    </div>
  )
}
